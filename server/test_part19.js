const crypto = require("crypto");

const BASE_URL = "http://localhost:5000/api";
const RAZORPAY_KEY_SECRET = "canteen_razorpay_secret_key_98765";
const RAZORPAY_WEBHOOK_SECRET = "canteen_webhook_secret_key_54321";

const logPass = (title) => console.log(`\x1b[32m✔ PASS:\x1b[0m ${title}`);
const logFail = (title, err) => {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${title}`);
  if (err) console.error(err);
  process.exitCode = 1;
};

const runTests = async () => {
  console.log("\n========================================================");
  console.log("       STARTING PART 19 ONLINE PAYMENT INTEGRATION TESTS");
  console.log("========================================================\n");

  let adminToken = null;
  let student1Token = null;
  let student2Token = null;
  let student1User = null;
  let student2User = null;
  let testProduct = null;

  try {
    // 1. Authenticate Test Users
    console.log("--- 1. Authenticating Roles ---");
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@college.edu",
        password: "Admin@12345",
      }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data?.token || adminData.token;
    if (!adminToken) throw new Error("Admin login failed");
    logPass("Admin authenticated (ADMIN role)");

    // Student 1
    const s1Res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "student_test@college.edu",
        password: "Student@12345",
      }),
    });
    const s1Data = await s1Res.json();
    student1Token = s1Data.data?.token || s1Data.token;
    student1User = s1Data.data?.user || s1Data.user;
    if (!student1Token) throw new Error("Student 1 login failed");
    logPass(`Student 1 authenticated: ${student1User.email}`);

    // Student 2 (register or login for ownership attack testing)
    const s2Res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "student2_test@college.edu",
        password: "Student@12345",
      }),
    });
    let s2Data = await s2Res.json();
    if (!s2Res.ok) {
      // Register student 2 if not exists
      const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Second Student",
          email: "student2_test@college.edu",
          password: "Student@12345",
          phone: "9876543219",
          studentId: "STU-2026-999",
        }),
      });
      s2Data = await regRes.json();
    }
    student2Token = s2Data.data?.token || s2Data.token;
    student2User = s2Data.data?.user || s2Data.user;
    if (!student2Token) throw new Error("Student 2 authentication failed");
    logPass(`Student 2 authenticated: ${student2User?.email || "student2_test@college.edu"}`);

    // Ensure store is open
    await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        storeName: "College Canteen",
        manualOverride: true,
        isOpen: true,
        acceptingOrders: true,
        cancellationWindowSeconds: 30,
      }),
    });

    // Fetch product with stock
    const prodRes = await fetch(`${BASE_URL}/products?limit=10`);
    const prodData = await prodRes.json();
    const allProducts = prodData.data?.products || prodData.products || [];
    testProduct = allProducts.find((p) => p.isAvailable && p.stock >= 10);
    if (!testProduct) throw new Error("No test product with stock >= 10");
    const initialProductStock = testProduct.stock;
    console.log(`Using product: "${testProduct.name}" (Price: ₹${testProduct.price}, Stock: ${initialProductStock})`);

    // 2. CASH Order Invariance
    console.log("\n--- 2. CASH Order Invariance ---");
    const cashOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct.id || testProduct._id, quantity: 1 }],
        paymentMethod: "CASH",
        notes: "Cash order invariance test",
      }),
    });
    const cashOrderData = await cashOrderRes.json();
    const cashOrder = cashOrderData.data?.order || cashOrderData.order;
    if (cashOrderRes.status === 201 && cashOrder.paymentMethod === "CASH" && cashOrder.paymentStatus === "PENDING") {
      logPass("CASH order created: paymentMethod=CASH, paymentStatus=PENDING");
    } else {
      throw new Error(`CASH order creation failed: ${JSON.stringify(cashOrderData)}`);
    }

    // Attempting to create online gateway order on CASH order must be rejected
    const cashGatewayRes = await fetch(`${BASE_URL}/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ orderId: cashOrder.id || cashOrder._id }),
    });
    const cashGatewayData = await cashGatewayRes.json();
    if (cashGatewayRes.status === 400 && cashGatewayData.success === false) {
      logPass(`Gateway order rejected for CASH order (HTTP 400): "${cashGatewayData.message}"`);
    } else {
      throw new Error(`Expected 400 for CASH order payment init, got ${cashGatewayRes.status}`);
    }

    // 3. Online Order Creation & Gateway Transaction Initiation
    console.log("\n--- 3. Online Order Creation & Gateway Initiation ---");
    const onlineOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct.id || testProduct._id, quantity: 2 }],
        paymentMethod: "ONLINE",
        notes: "Online payment flow test",
      }),
    });
    const onlineOrderData = await onlineOrderRes.json();
    const onlineOrder = onlineOrderData.data?.order || onlineOrderData.order;
    const onlineOrderId = onlineOrder.id || onlineOrder._id;
    if (onlineOrderRes.status === 201 && onlineOrder.paymentMethod === "ONLINE" && onlineOrder.paymentStatus === "PENDING") {
      logPass(`ONLINE order created: Total ₹${onlineOrder.totalAmount}, Status = PENDING`);
    } else {
      throw new Error(`ONLINE order creation failed: ${JSON.stringify(onlineOrderData)}`);
    }

    // 4. Ownership Security: Student 2 cannot initiate payment for Student 1's order
    console.log("\n--- 4. Ownership Verification on Payment Initiation ---");
    const hijackRes = await fetch(`${BASE_URL}/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student2Token}`,
      },
      body: JSON.stringify({ orderId: onlineOrderId }),
    });
    const hijackData = await hijackRes.json();
    if (hijackRes.status === 403 && hijackData.success === false) {
      logPass(`Cross-student payment initiation rejected with HTTP 403 Forbidden: "${hijackData.message}"`);
    } else {
      throw new Error(`Expected HTTP 403 for cross-user payment init, got ${hijackRes.status}`);
    }

    // 5. Authoritative Gateway Order Creation
    console.log("\n--- 5. Server-Authoritative Gateway Order Creation ---");
    const createGatewayRes = await fetch(`${BASE_URL}/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ orderId: onlineOrderId }),
    });
    const createGatewayData = await createGatewayRes.json();
    const gatewayInfo = createGatewayData.data;

    const expectedPaise = Math.round(onlineOrder.totalAmount * 100);
    if (
      createGatewayRes.status === 200 &&
      gatewayInfo &&
      gatewayInfo.razorpayOrderId &&
      gatewayInfo.amount === expectedPaise &&
      gatewayInfo.currency === "INR" &&
      gatewayInfo.keyId &&
      !gatewayInfo.keySecret // Secret key MUST NEVER be leaked
    ) {
      logPass(`Gateway order created: ID = ${gatewayInfo.razorpayOrderId}, Amount = ${gatewayInfo.amount} paise (₹${onlineOrder.totalAmount}), KeyID returned safely without secrets`);
    } else {
      throw new Error(`Failed to create gateway order: ${JSON.stringify(createGatewayData)}`);
    }

    // Idempotency: Calling create-order again returns same providerOrderId without failure
    const repeatGatewayRes = await fetch(`${BASE_URL}/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ orderId: onlineOrderId }),
    });
    const repeatGatewayData = await repeatGatewayRes.json();
    if (
      repeatGatewayRes.status === 200 &&
      repeatGatewayData.data?.razorpayOrderId === gatewayInfo.razorpayOrderId
    ) {
      logPass("Idempotency: Repeated create-order calls safely return existing providerOrderId");
    } else {
      throw new Error("Repeated create-order calls did not return identical transaction");
    }

    // 6. Rule 11: Prevent Admin Confirming Unpaid Online Order
    console.log("\n--- 6. Rule 11 Enforcement: Order Confirmation Block on Unpaid Online Order ---");
    const prematureConfirmRes = await fetch(
      `${BASE_URL}/admin/orders/${onlineOrderId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: "CONFIRMED" }),
      }
    );
    const prematureConfirmData = await prematureConfirmRes.json();
    if (prematureConfirmRes.status === 400 && prematureConfirmData.success === false) {
      logPass(`Premature order confirmation rejected with HTTP 400: "${prematureConfirmData.message}"`);
    } else {
      throw new Error(`Expected HTTP 400 for premature confirmation, got ${prematureConfirmRes.status}`);
    }

    // 7. Payment Verification - Signature Tampering Rejection
    console.log("\n--- 7. Cryptographic Signature Tampering Rejection ---");
    const fakePaymentId = `pay_fake_${Date.now()}`;
    const fakeSignature = "invalid_tampered_signature_1234567890abcdef";

    const invalidVerifyRes = await fetch(`${BASE_URL}/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        orderId: onlineOrderId,
        razorpayPaymentId: fakePaymentId,
        razorpayOrderId: gatewayInfo.razorpayOrderId,
        razorpaySignature: fakeSignature,
      }),
    });
    const invalidVerifyData = await invalidVerifyRes.json();
    if (invalidVerifyRes.status === 400 && invalidVerifyData.success === false) {
      logPass(`Invalid cryptographic signature rejected with HTTP 400: "${invalidVerifyData.message}"`);
    } else {
      throw new Error(`Expected HTTP 400 for invalid signature, got ${invalidVerifyRes.status}`);
    }

    // Verify payment was marked as FAILED in payment query
    const paymentCheckRes = await fetch(`${BASE_URL}/payments/order/${onlineOrderId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const paymentCheckData = await paymentCheckRes.json();
    if (paymentCheckData.data?.payment?.status === "FAILED") {
      logPass("Payment status recorded as FAILED after failed signature verification");
    } else {
      throw new Error(`Expected FAILED payment status, got: ${paymentCheckData.data?.payment?.status}`);
    }

    // 8. Payment Verification - Genuine HMAC-SHA256 Signature Verification
    console.log("\n--- 8. Genuine HMAC-SHA256 Verification & Non-Decrement Invariance ---");
    // Fetch product stock BEFORE payment verification
    const preVerifyProdRes = await fetch(`${BASE_URL}/products?limit=10`);
    const preVerifyProdData = await preVerifyProdRes.json();
    const stockBeforeVerify = (preVerifyProdData.data?.products || preVerifyProdData.products).find(
      (p) => (p.id || p._id) === (testProduct.id || testProduct._id)
    )?.stock;

    const validPaymentId = `pay_rzp_${crypto.randomBytes(6).toString("hex")}`;
    const validSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${gatewayInfo.razorpayOrderId}|${validPaymentId}`)
      .digest("hex");

    const validVerifyRes = await fetch(`${BASE_URL}/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        orderId: onlineOrderId,
        razorpayPaymentId: validPaymentId,
        razorpayOrderId: gatewayInfo.razorpayOrderId,
        razorpaySignature: validSignature,
      }),
    });
    const validVerifyData = await validVerifyRes.json();
    if (
      validVerifyRes.status === 200 &&
      validVerifyData.success === true &&
      validVerifyData.data?.order?.paymentStatus === "PAID" &&
      validVerifyData.data?.payment?.status === "PAID" &&
      validVerifyData.data?.payment?.providerPaymentId === validPaymentId
    ) {
      logPass("Valid cryptographic signature verified: Payment status = PAID, Order paymentStatus = PAID");
    } else {
      throw new Error(`Valid payment verification failed: ${JSON.stringify(validVerifyData)}`);
    }

    // FINANCIAL INVARIANCE CHECK: Stock must NOT have decremented a second time on payment verification!
    const postVerifyProdRes = await fetch(`${BASE_URL}/products?limit=10`);
    const postVerifyProdData = await postVerifyProdRes.json();
    const stockAfterVerify = (postVerifyProdData.data?.products || postVerifyProdData.products).find(
      (p) => (p.id || p._id) === (testProduct.id || testProduct._id)
    )?.stock;

    if (stockAfterVerify === stockBeforeVerify) {
      logPass(`Inventory Non-Decrement Invariance passed: Stock remained at ${stockAfterVerify} after payment success`);
    } else {
      throw new Error(`Stock changed after payment verification! Before: ${stockBeforeVerify}, After: ${stockAfterVerify}`);
    }

    // Idempotency: Re-verifying already PAID order succeeds immediately without side-effects
    const reverifyRes = await fetch(`${BASE_URL}/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        orderId: onlineOrderId,
        razorpayPaymentId: validPaymentId,
        razorpayOrderId: gatewayInfo.razorpayOrderId,
        razorpaySignature: validSignature,
      }),
    });
    const reverifyData = await reverifyRes.json();
    if (reverifyRes.status === 200 && reverifyData.success === true) {
      logPass("Idempotency: Re-submitting verification for already PAID order succeeds without error");
    } else {
      throw new Error(`Re-verification idempotency failed: ${JSON.stringify(reverifyData)}`);
    }

    // 9. Admin Can Now Confirm Paid Online Order
    console.log("\n--- 9. Order Confirmation Permitted Once Paid ---");
    const confirmPaidRes = await fetch(
      `${BASE_URL}/admin/orders/${onlineOrderId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: "CONFIRMED" }),
      }
    );
    const confirmPaidData = await confirmPaidRes.json();
    if (confirmPaidRes.status === 200 && confirmPaidData.data?.order?.orderStatus === "CONFIRMED") {
      logPass("Admin successfully moved PAID online order to CONFIRMED");
    } else {
      throw new Error(`Failed to confirm paid order: ${JSON.stringify(confirmPaidData)}`);
    }

    // 10. Webhook Integration & Asynchronous Captures
    console.log("\n--- 10. Webhook Processing & Signature Verification ---");
    // Create fresh online order for webhook test
    const webhookOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct.id || testProduct._id, quantity: 1 }],
        paymentMethod: "ONLINE",
        notes: "Webhook test order",
      }),
    });
    const webhookOrderData = await webhookOrderRes.json();
    const webhookOrderId = webhookOrderData.data?.order?.id || webhookOrderData.data?.order?._id;

    // Initialize payment for webhook order
    const whGatewayRes = await fetch(`${BASE_URL}/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ orderId: webhookOrderId }),
    });
    const whGatewayData = await whGatewayRes.json();
    const whProviderOrderId = whGatewayData.data?.razorpayOrderId;

    // Webhook with invalid signature
    const whPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_wh_${Date.now()}`,
            order_id: whProviderOrderId,
            status: "captured",
          },
        },
      },
    });

    const badWhRes = await fetch(`${BASE_URL}/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": "tampered_webhook_signature",
      },
      body: whPayload,
    });
    const badWhData = await badWhRes.json();
    if (badWhRes.status === 400 && badWhData.success === false) {
      logPass(`Tampered webhook signature rejected with HTTP 400: "${badWhData.message}"`);
    } else {
      throw new Error(`Expected HTTP 400 for bad webhook signature, got ${badWhRes.status}`);
    }

    // Webhook with valid signature
    const validWhSignature = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(whPayload)
      .digest("hex");

    const goodWhRes = await fetch(`${BASE_URL}/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": validWhSignature,
      },
      body: whPayload,
    });
    const goodWhData = await goodWhRes.json();
    if (goodWhRes.status === 200 && goodWhData.success === true) {
      logPass("Valid webhook accepted: Payment status updated to PAID asynchronously");
    } else {
      throw new Error(`Valid webhook failed: ${JSON.stringify(goodWhData)}`);
    }

    // Verify in order details
    const whOrderCheckRes = await fetch(`${BASE_URL}/orders/${webhookOrderId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const whOrderCheckData = await whOrderCheckRes.json();
    if (whOrderCheckData.data?.order?.paymentStatus === "PAID") {
      logPass("Order paymentStatus confirmed as PAID via webhook");
    } else {
      throw new Error(`Expected PAID paymentStatus after webhook, got: ${whOrderCheckData.data?.order?.paymentStatus}`);
    }

    // 11. Cancellation & Refund Policy Boundary
    console.log("\n--- 11. Cancellation & Refund Policy Boundary ---");

    // Case A: Student cancels a PAID order within 30 seconds -> Payment marked REFUNDED, Order CANCELLED & REFUNDED, stock restored
    const stockBeforeCancelCaseA = (
      await (await fetch(`${BASE_URL}/products?limit=10`)).json()
    ).data?.products?.find((p) => (p.id || p._id) === (testProduct.id || testProduct._id))?.stock;

    const cancelPaidRes = await fetch(`${BASE_URL}/orders/${webhookOrderId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ reason: "Student requested refund within 30s window" }),
    });
    const cancelPaidData = await cancelPaidRes.json();
    const cancelledPaidOrder = cancelPaidData.data?.order || cancelPaidData.order;

    if (
      cancelPaidRes.status === 200 &&
      cancelledPaidOrder?.orderStatus === "CANCELLED" &&
      cancelledPaidOrder?.paymentStatus === "REFUNDED"
    ) {
      logPass("Paid order cancelled within 30s: orderStatus = CANCELLED, paymentStatus = REFUNDED");
    } else {
      throw new Error(`Paid order cancel failed: ${JSON.stringify(cancelPaidData)}`);
    }

    // Check payment record
    const paymentRefundCheck = await (
      await fetch(`${BASE_URL}/payments/order/${webhookOrderId}`, {
        headers: { Authorization: `Bearer ${student1Token}` },
      })
    ).json();
    if (paymentRefundCheck.data?.payment?.status === "REFUNDED" && paymentRefundCheck.data?.payment?.refundedAt) {
      logPass("Payment document status updated to REFUNDED with refundedAt timestamp");
    } else {
      throw new Error(`Payment document refund check failed: ${JSON.stringify(paymentRefundCheck)}`);
    }

    // Stock restoration check
    const stockAfterCancelCaseA = (
      await (await fetch(`${BASE_URL}/products?limit=10`)).json()
    ).data?.products?.find((p) => (p.id || p._id) === (testProduct.id || testProduct._id))?.stock;

    if (stockAfterCancelCaseA === stockBeforeCancelCaseA + 1) {
      logPass(`Inventory restored on cancellation (+1): New stock = ${stockAfterCancelCaseA}`);
    } else {
      throw new Error(`Stock not restored properly! Before: ${stockBeforeCancelCaseA}, After: ${stockAfterCancelCaseA}`);
    }

    // Case B: Student cancels an UNPAID online order within 30 seconds -> Payment marked FAILED, Order CANCELLED & FAILED
    const unpaidOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct.id || testProduct._id, quantity: 1 }],
        paymentMethod: "ONLINE",
        notes: "Unpaid cancel test",
      }),
    });
    const unpaidOrderData = await unpaidOrderRes.json();
    const unpaidOrderId = unpaidOrderData.data?.order?.id || unpaidOrderData.data?.order?._id;

    const cancelUnpaidRes = await fetch(`${BASE_URL}/orders/${unpaidOrderId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ reason: "Decided not to pay" }),
    });
    const cancelUnpaidData = await cancelUnpaidRes.json();
    const cancelledUnpaidOrder = cancelUnpaidData.data?.order || cancelUnpaidData.order;

    if (
      cancelUnpaidRes.status === 200 &&
      cancelledUnpaidOrder?.orderStatus === "CANCELLED" &&
      cancelledUnpaidOrder?.paymentStatus === "FAILED"
    ) {
      logPass("Unpaid order cancelled: orderStatus = CANCELLED, paymentStatus = FAILED");
    } else {
      throw new Error(`Unpaid cancel failed: ${JSON.stringify(cancelUnpaidData)}`);
    }

    // Case C: Cannot initiate or verify payment on cancelled order
    const payCancelledRes = await fetch(`${BASE_URL}/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ orderId: unpaidOrderId }),
    });
    const payCancelledData = await payCancelledRes.json();
    if (payCancelledRes.status === 400 && payCancelledData.success === false) {
      logPass(`Attempting payment on cancelled order rejected (HTTP 400): "${payCancelledData.message}"`);
    } else {
      throw new Error(`Expected HTTP 400 for paying cancelled order, got ${payCancelledRes.status}`);
    }

    console.log("\n========================================================");
    console.log("   ALL PART 19 ONLINE PAYMENT INTEGRATION TESTS PASSED! ");
    console.log("========================================================\n");
  } catch (err) {
    logFail("Test suite failed with an exception", err);
  }
};

runTests();
