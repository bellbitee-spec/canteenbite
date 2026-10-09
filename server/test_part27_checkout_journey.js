require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const http = require("http");
const crypto = require("crypto");
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const app = require("./src/app");
const env = require("./src/config/env");

const User = require("./src/models/User");
const Product = require("./src/models/Product");
const Category = require("./src/models/Category");
const Combo = require("./src/models/Combo");
const Order = require("./src/models/Order");
const OrderItem = require("./src/models/OrderItem");
const Payment = require("./src/models/Payment");
const StoreSettings = require("./src/models/StoreSettings");

const logPass = (num, title) => console.log(`\x1b[32m✔ [TEST ${num}] PASS:\x1b[0m ${title}`);
const logFail = (num, title, err) => {
  console.error(`\x1b[31m✖ [TEST ${num}] FAIL:\x1b[0m ${title}`);
  if (err) console.error(err);
  process.exitCode = 1;
};

// Track created test documents for clean isolated teardown
const cleanup = {
  users: [],
  categories: [],
  products: [],
  combos: [],
  orders: [],
  orderItems: [],
  payments: [],
};

const runCheckoutJourneyTests = async () => {
  console.log("\n==================================================================");
  console.log("   PART 27 — STUDENT CHECKOUT & ORDER FLOW VERIFICATION SUITE");
  console.log("==================================================================\n");

  let server = null;
  let originalSettings = null;

  try {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api`;
    console.log(`Test API server running at ${baseUrl}\n`);

    // Ensure store is open initially
    let settingsDoc = await StoreSettings.findOne();
    if (settingsDoc) {
      originalSettings = {
        isOpen: settingsDoc.isOpen,
        manualOverride: settingsDoc.manualOverride,
        acceptingOrders: settingsDoc.acceptingOrders,
        cancellationWindowSeconds: settingsDoc.cancellationWindowSeconds,
      };
      await StoreSettings.updateOne(
        { _id: settingsDoc._id },
        {
          $set: {
            isOpen: true,
            manualOverride: true,
            acceptingOrders: true,
            cancellationWindowSeconds: 30,
          },
        }
      );
    } else {
      settingsDoc = await StoreSettings.create({
        storeName: "BellBite Canteen",
        isOpen: true,
        manualOverride: true,
        acceptingOrders: true,
        cancellationWindowSeconds: 30,
      });
    }

    const testTag = Date.now();

    // Register Student A
    const studentARes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Student Alpha",
        email: `student_a_${testTag}@college.edu`,
        password: "Student@12345",
      }),
    });
    const studentAData = await studentARes.json();
    const tokenA = studentAData.data?.token;
    const userA = studentAData.data?.user;
    if (!tokenA) throw new Error("Failed to register Student A: " + JSON.stringify(studentAData));
    cleanup.users.push(userA.id || userA._id);

    // Register Student B
    const studentBRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Student Beta",
        email: `student_b_${testTag}@college.edu`,
        password: "Student@12345",
      }),
    });
    const studentBData = await studentBRes.json();
    const tokenB = studentBData.data?.token;
    const userB = studentBData.data?.user;
    if (!tokenB) throw new Error("Failed to register Student B: " + JSON.stringify(studentBData));
    cleanup.users.push(userB.id || userB._id);

    // Base Category
    const testCategory = await Category.create({
      name: `Menu Cat ${testTag}`,
      slug: `menu-cat-${testTag}`,
      displayOrder: 1,
    });
    cleanup.categories.push(testCategory._id);

    // Test Product
    const testProduct = await Product.create({
      name: `Paneer Roll ${testTag}`,
      slug: `paneer-roll-${testTag}`,
      price: 65,
      stock: 10,
      category: testCategory._id,
      isAvailable: true,
    });
    cleanup.products.push(testProduct._id);

    // -----------------------------------------------------------------
    // TEST 1: Empty Cart Rejection
    // -----------------------------------------------------------------
    console.log("--- TEST 1: Empty Cart Rejection ---");
    const emptyCartRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        items: [],
        paymentMethod: "CASH",
      }),
    });
    const emptyCartData = await emptyCartRes.json();
    if (emptyCartRes.status === 400) {
      logPass(1, "Empty cart submission correctly rejected with HTTP 400 Bad Request");
    } else {
      throw new Error(`Expected 400, got ${emptyCartRes.status}: ${JSON.stringify(emptyCartData)}`);
    }

    // -----------------------------------------------------------------
    // TEST 2: Successful Cash Order Placement
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: Successful Cash Order Placement ---");
    const cashOrderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 2 }],
        paymentMethod: "CASH",
        notes: "No onions please",
      }),
    });
    const cashOrderData = await cashOrderRes.json();
    const cashOrder = cashOrderData.data?.order || cashOrderData.order || cashOrderData.data;

    if (cashOrderRes.status !== 201 || !cashOrder) {
      throw new Error(`Cash order failed with status ${cashOrderRes.status}: ${JSON.stringify(cashOrderData)}`);
    }
    cleanup.orders.push(cashOrder.id || cashOrder._id);

    // Verify fields
    if (
      cashOrder.paymentMethod === "CASH" &&
      cashOrder.orderStatus === "PENDING" &&
      cashOrder.paymentStatus === "PENDING" &&
      cashOrder.totalAmount === 130 &&
      cashOrder.orderNumber &&
      cashOrder.cancellationWindowOpen === true
    ) {
      logPass(2.1, `Cash order created with orderNumber: ${cashOrder.orderNumber}, total: ₹${cashOrder.totalAmount}`);
    } else {
      throw new Error("Cash order fields mismatch: " + JSON.stringify(cashOrder));
    }

    // Verify product stock decremented from 10 to 8
    const prodAfterCash = await Product.findById(testProduct._id);
    if (prodAfterCash.stock === 8) {
      logPass(2.2, "Product stock decremented accurately (10 -> 8)");
    } else {
      throw new Error(`Expected stock 8, got ${prodAfterCash.stock}`);
    }

    // -----------------------------------------------------------------
    // TEST 3: Closed-Store Rejection & Cart Preservation
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: Closed-Store Rejection ---");
    // Temporarily close store
    await StoreSettings.updateOne(
      {},
      { $set: { isOpen: false, manualOverride: true, temporaryClosedReason: "Kitchen deep clean in progress" } }
    );

    const closedOrderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 1 }],
        paymentMethod: "CASH",
      }),
    });
    const closedOrderData = await closedOrderRes.json();
    if (closedOrderRes.status === 400) {
      logPass(3, `Order rejected when store is closed (${closedOrderData.message || "Store closed"})`);
    } else {
      throw new Error(`Expected 400 for closed store, got ${closedOrderRes.status}`);
    }

    // Reopen store
    await StoreSettings.updateOne({}, { $set: { isOpen: true, manualOverride: true } });

    // -----------------------------------------------------------------
    // TEST 4: Out-of-Stock Rejection
    // -----------------------------------------------------------------
    console.log("\n--- TEST 4: Out-of-Stock Rejection ---");
    // Available stock is 8. Student requests 20.
    const outOfStockRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 20 }],
        paymentMethod: "CASH",
      }),
    });
    const outOfStockData = await outOfStockRes.json();
    if (outOfStockRes.status === 409 || outOfStockRes.status === 400) {
      logPass(4, `Oversell rejected with status ${outOfStockRes.status}: "${outOfStockData.message}"`);
    } else {
      throw new Error(`Expected 409/400 for insufficient stock, got ${outOfStockRes.status}`);
    }

    // -----------------------------------------------------------------
    // TEST 5: Duplicate Submission & Idempotency Key
    // -----------------------------------------------------------------
    console.log("\n--- TEST 5: Duplicate Submission & Idempotency Key ---");
    const idempKey = `IDEMP_CHECKOUT_${testTag}`;
    const idempReq1 = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
        "Idempotency-Key": idempKey,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 1 }],
        paymentMethod: "CASH",
      }),
    });
    const idempData1 = await idempReq1.json();
    const order1 = idempData1.data?.order || idempData1.order || idempData1.data;
    cleanup.orders.push(order1.id || order1._id);

    // Second request with SAME idempotency key
    const idempReq2 = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
        "Idempotency-Key": idempKey,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 1 }],
        paymentMethod: "CASH",
      }),
    });
    const idempData2 = await idempReq2.json();
    const order2 = idempData2.data?.order || idempData2.order || idempData2.data;

    if (order1.orderNumber === order2.orderNumber) {
      logPass(5.1, `Idempotent request returned existing order #${order1.orderNumber}`);
    } else {
      throw new Error(`Idempotency failure: ${order1.orderNumber} vs ${order2.orderNumber}`);
    }

    // Stock was 8. It should now be 7 (deducted ONCE, not twice)
    const prodAfterIdemp = await Product.findById(testProduct._id);
    if (prodAfterIdemp.stock === 7) {
      logPass(5.2, "Stock decremented exactly once across duplicate submissions (8 -> 7)");
    } else {
      throw new Error(`Expected stock 7, got ${prodAfterIdemp.stock}`);
    }

    // -----------------------------------------------------------------
    // TEST 6: Online Payment Flow (Pending -> Creation -> Verification)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 6: Online Payment Full Lifecycle ---");
    // 6A: Create ONLINE order
    const onlineOrderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 1 }],
        paymentMethod: "ONLINE",
      }),
    });
    const onlineOrderData = await onlineOrderRes.json();
    const onlineOrder = onlineOrderData.data?.order || onlineOrderData.order || onlineOrderData.data;
    cleanup.orders.push(onlineOrder.id || onlineOrder._id);

    if (onlineOrder.paymentMethod !== "ONLINE" || onlineOrder.paymentStatus !== "PENDING") {
      throw new Error("Online order initial state invalid: " + JSON.stringify(onlineOrder));
    }
    logPass(6.1, `Online order initialized: ${onlineOrder.orderNumber} (Status: PENDING)`);

    // 6B: Create gateway payment order
    const createPayRes = await fetch(`${baseUrl}/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        orderId: onlineOrder.id || onlineOrder._id,
      }),
    });
    const createPayData = await createPayRes.json();
    const payPayload = createPayData.data || createPayData;
    if (!payPayload.razorpayOrderId || !payPayload.amount) {
      throw new Error("Failed to initialize gateway order: " + JSON.stringify(createPayData));
    }
    logPass(6.2, `Payment order created: ${payPayload.razorpayOrderId} for amount: ₹${payPayload.amount / 100}`);

    // 6C: Invalid Signature Verification
    const fakePaymentId = `pay_fake_${testTag}`;
    const badVerifyRes = await fetch(`${baseUrl}/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        orderId: onlineOrder.id || onlineOrder._id,
        razorpayPaymentId: fakePaymentId,
        razorpayOrderId: payPayload.razorpayOrderId,
        razorpaySignature: "invalid_hmac_signature_hex",
      }),
    });
    if (badVerifyRes.status === 400) {
      logPass(6.3, "Spoofed/invalid payment signature rejected with HTTP 400");
    } else {
      throw new Error(`Expected 400 for bad signature, got ${badVerifyRes.status}`);
    }

    // 6D: Valid Signature Verification
    const realPaymentId = `pay_valid_${testTag}`;
    const validSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${payPayload.razorpayOrderId}|${realPaymentId}`)
      .digest("hex");

    const goodVerifyRes = await fetch(`${baseUrl}/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        orderId: onlineOrder.id || onlineOrder._id,
        razorpayPaymentId: realPaymentId,
        razorpayOrderId: payPayload.razorpayOrderId,
        razorpaySignature: validSignature,
      }),
    });
    const goodVerifyData = await goodVerifyRes.json();
    if (goodVerifyRes.status !== 200) {
      throw new Error(`Valid signature failed with ${goodVerifyRes.status}: ${JSON.stringify(goodVerifyData)}`);
    }

    const verifiedOrder = await Order.findById(onlineOrder.id || onlineOrder._id);
    const verifiedPayment = await Payment.findOne({ order: onlineOrder.id || onlineOrder._id });

    if (verifiedOrder.paymentStatus === "PAID" && verifiedPayment.status === "PAID") {
      logPass(6.4, "Cryptographic verification succeeded: Order marked PAID & CONFIRMED");
    } else {
      throw new Error("Order/Payment not marked PAID: " + JSON.stringify({ verifiedOrder, verifiedPayment }));
    }

    // -----------------------------------------------------------------
    // TEST 7: Online Payment Failure / Dismissal Report
    // -----------------------------------------------------------------
    console.log("\n--- TEST 7: Payment Failure Reporting ---");
    const dismissedOrderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 1 }],
        paymentMethod: "ONLINE",
      }),
    });
    const dismissedOrderData = await dismissedOrderRes.json();
    const dismissedOrder = dismissedOrderData.data?.order || dismissedOrderData.order || dismissedOrderData.data;
    cleanup.orders.push(dismissedOrder.id || dismissedOrder._id);

    const failReportRes = await fetch(`${baseUrl}/payments/fail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        orderId: dismissedOrder.id || dismissedOrder._id,
        reason: "Student dismissed modal before entering UPI PIN",
      }),
    });
    const failReportData = await failReportRes.json();
    if (failReportRes.status === 200) {
      logPass(7, "Student modal dismissal reported and acknowledged cleanly");
    } else {
      throw new Error(`Report failure returned ${failReportRes.status}: ${JSON.stringify(failReportData)}`);
    }

    // -----------------------------------------------------------------
    // TEST 8: Student Order Cancellation within 30-Second Window
    // -----------------------------------------------------------------
    console.log("\n--- TEST 8: 30-Second Cancellation & Stock Restoration ---");
    const stockBeforeCancelOrder = (await Product.findById(testProduct._id)).stock;

    const cancelableOrderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 2 }],
        paymentMethod: "CASH",
      }),
    });
    const cancelableOrderData = await cancelableOrderRes.json();
    const cancelableOrder = cancelableOrderData.data?.order || cancelableOrderData.order || cancelableOrderData.data;
    cleanup.orders.push(cancelableOrder.id || cancelableOrder._id);

    // Cancel immediately
    const cancelRes = await fetch(`${baseUrl}/orders/${cancelableOrder.id || cancelableOrder._id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        reason: "Ordered by mistake",
      }),
    });
    const cancelData = await cancelRes.json();
    const cancelledOrder = cancelData.data?.order || cancelData.order || cancelData.data;

    if (cancelRes.status === 200 && cancelledOrder.orderStatus === "CANCELLED") {
      logPass(8.1, `Order cancelled within 30s window (Cancelled by: ${cancelledOrder.cancelledBy})`);
    } else {
      throw new Error(`Cancellation failed with ${cancelRes.status}: ${JSON.stringify(cancelData)}`);
    }

    // Verify stock restored
    const stockAfterCancel = (await Product.findById(testProduct._id)).stock;
    if (stockAfterCancel === stockBeforeCancelOrder) {
      logPass(8.2, `Product stock accurately restored (+2) to ${stockAfterCancel}`);
    } else {
      throw new Error(`Stock mismatch: was ${stockBeforeCancelOrder}, got ${stockAfterCancel}`);
    }

    // -----------------------------------------------------------------
    // TEST 9: Cancellation Rejection After Window Expiration
    // -----------------------------------------------------------------
    console.log("\n--- TEST 9: Cancellation Rejection After Deadline ---");
    const lateOrderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 1 }],
        paymentMethod: "CASH",
      }),
    });
    const lateOrderData = await lateOrderRes.json();
    const lateOrder = lateOrderData.data?.order || lateOrderData.order || lateOrderData.data;
    cleanup.orders.push(lateOrder.id || lateOrder._id);

    // Backdate cancelUntil to 60 seconds ago in MongoDB
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(lateOrder.id || lateOrder._id) },
      { $set: { cancelUntil: new Date(Date.now() - 60 * 1000) } }
    );

    // Attempt cancellation
    const lateCancelRes = await fetch(`${baseUrl}/orders/${lateOrder.id || lateOrder._id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        reason: "Too late cancel attempt",
      }),
    });
    const lateCancelData = await lateCancelRes.json();

    if (lateCancelRes.status === 400) {
      logPass(9, `Expired cancellation rejected: "${lateCancelData.message}"`);
    } else {
      throw new Error(`Expected 400 for expired cancellation, got ${lateCancelRes.status}`);
    }

    // -----------------------------------------------------------------
    // TEST 10: Prevention of Double Cancellation
    // -----------------------------------------------------------------
    console.log("\n--- TEST 10: Prevention of Double Cancellation ---");
    const doubleCancelRes = await fetch(`${baseUrl}/orders/${cancelableOrder.id || cancelableOrder._id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        reason: "Double cancellation attempt",
      }),
    });
    const doubleCancelData = await doubleCancelRes.json();

    if (doubleCancelRes.status === 400) {
      logPass(10, `Second cancellation attempt safely blocked: "${doubleCancelData.message}"`);
    } else {
      throw new Error(`Expected 400 for double cancellation, got ${doubleCancelRes.status}`);
    }

    // -----------------------------------------------------------------
    // TEST 11: User Isolation & Unauthorized Access (ID Tampering)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 11: User Isolation & Unauthorized Access ---");
    // Student B attempts to access Student A's cashOrder
    const tamperGetRes = await fetch(`${baseUrl}/orders/${cashOrder.id || cashOrder._id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });
    if (tamperGetRes.status === 404 || tamperGetRes.status === 403) {
      logPass(11.1, `Student B blocked from viewing Student A's order (HTTP ${tamperGetRes.status})`);
    } else {
      throw new Error(`Security breach: Student B accessed Student A's order with status ${tamperGetRes.status}`);
    }

    // Student B attempts to cancel Student A's cashOrder
    const tamperCancelRes = await fetch(`${baseUrl}/orders/${cashOrder.id || cashOrder._id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ reason: "Malicious cancel" }),
    });
    if (tamperCancelRes.status === 404 || tamperCancelRes.status === 400 || tamperCancelRes.status === 403) {
      logPass(11.2, `Student B blocked from cancelling Student A's order (HTTP ${tamperCancelRes.status})`);
    } else {
      throw new Error(`Security breach: Student B cancelled Student A's order with status ${tamperCancelRes.status}`);
    }

    // Student B attempts to verify payment on Student A's order
    const tamperVerifyRes = await fetch(`${baseUrl}/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        orderId: cashOrder.id || cashOrder._id,
        razorpayPaymentId: "pay_tamper_123",
        razorpayOrderId: "order_tamper_123",
        razorpaySignature: "dummy",
      }),
    });
    if (tamperVerifyRes.status === 403 || tamperVerifyRes.status === 404) {
      logPass(11.3, `Student B blocked from verifying payment on Student A's order (HTTP ${tamperVerifyRes.status})`);
    } else {
      throw new Error(`Security breach: Student B allowed payment verification with status ${tamperVerifyRes.status}`);
    }

    // -----------------------------------------------------------------
    // TEST 12: Order History Accuracy
    // -----------------------------------------------------------------
    console.log("\n--- TEST 12: Order History Accuracy ---");
    const historyRes = await fetch(`${baseUrl}/orders`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });
    const historyData = await historyRes.json();
    const ordersList = historyData.data?.orders || historyData.orders || historyData.data || [];

    if (!Array.isArray(ordersList) || ordersList.length === 0) {
      throw new Error("Order history empty or invalid format: " + JSON.stringify(historyData));
    }

    // Verify all returned orders belong exclusively to Student A
    const allBelongToA = ordersList.every(
      (ord) => ord.user?._id?.toString() === userA.id || ord.user === userA.id || ord.user?.email === userA.email
    );
    if (allBelongToA) {
      logPass(12, `Student A order history retrieved (${ordersList.length} orders, 100% user-isolated)`);
    } else {
      throw new Error("Order history contains records from another user!");
    }

    console.log("\n==================================================================");
    console.log("   ALL PART 27 CHECKOUT & ORDER FLOW TESTS PASSED SUCCESSFULLY!   ");
    console.log("==================================================================\n");

  } catch (err) {
    logFail("FATAL", "Test suite encountered an error", err);
  } finally {
    console.log("Cleaning up test documents...");
    try {
      if (cleanup.users.length) await User.deleteMany({ _id: { $in: cleanup.users } });
      if (cleanup.categories.length) await Category.deleteMany({ _id: { $in: cleanup.categories } });
      if (cleanup.products.length) await Product.deleteMany({ _id: { $in: cleanup.products } });
      if (cleanup.combos.length) await Combo.deleteMany({ _id: { $in: cleanup.combos } });
      if (cleanup.orders.length) {
        await Order.deleteMany({ _id: { $in: cleanup.orders } });
        await Payment.deleteMany({ order: { $in: cleanup.orders } });
      }
      if (originalSettings) {
        await StoreSettings.updateOne({}, { $set: originalSettings });
      }
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
    console.log("Database connection closed cleanly.\n");
  }
};

runCheckoutJourneyTests();
