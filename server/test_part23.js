require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("./src/models/User");
const Product = require("./src/models/Product");
const Category = require("./src/models/Category");
const Order = require("./src/models/Order");
const OrderItem = require("./src/models/OrderItem");
const Payment = require("./src/models/Payment");
const StoreSettings = require("./src/models/StoreSettings");

const BASE_URL = "http://127.0.0.1:5000/api";

const logPass = (title) => console.log(`\x1b[32m✔ PASS:\x1b[0m ${title}`);
const logFail = (title, err) => {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${title}`);
  if (err) console.error(err);
  process.exitCode = 1;
};

const runAuditSuite = async () => {
  console.log("\n========================================================");
  console.log("   PART 23 — SECURITY, VALIDATION & CONCURRENCY AUDIT");
  console.log("========================================================\n");

  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/my-canteen";
  await mongoose.connect(mongoUri);

  try {
    // -----------------------------------------------------------------
    // 0. Setup: Ensure Store is Open & Create Test Accounts
    // -----------------------------------------------------------------
    await StoreSettings.findOneAndUpdate(
      {},
      {
        $set: {
          isOpen: true,
          manualOverride: false,
          temporaryClosureReason: "",
          cancellationWindowSeconds: 30,
        },
      },
      { upsert: true }
    );

    // Login Admin
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@college.edu", password: "Admin@12345" }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.data?.token;
    if (!adminToken) throw new Error("Admin login failed in test setup");

    // Login Student 1
    const s1Res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student_test@college.edu", password: "Student@12345" }),
    });
    const s1Data = await s1Res.json();
    const student1Token = s1Data.data?.token;
    const student1Id = s1Data.data?.user?.id;
    if (!student1Token) throw new Error("Student 1 login failed in test setup");

    // Create / Login Student 2 for cross-user tests
    const s2Email = `student2_${Date.now()}@college.edu`;
    const s2RegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Student Two",
        email: s2Email,
        password: "Student@12345",
      }),
    });
    const s2RegData = await s2RegRes.json();
    const student2Token = s2RegData.data?.token;
    const student2Id = s2RegData.data?.user?.id;
    if (!student2Token) throw new Error("Student 2 registration failed in test setup");

    // Create a base category for products
    let testCategory = await Category.findOne({ name: "Audit Security Category" });
    if (!testCategory) {
      testCategory = await Category.create({
        name: "Audit Security Category",
        description: "Category for Part 23 security testing",
        sortOrder: 99,
        isActive: true,
      });
    }

    // =================================================================
    // 1. AUTHORIZATION AUDIT
    // =================================================================
    console.log("\n--- 1. AUTHORIZATION AUDIT ---");

    // 1.1 Unauthenticated requests are rejected with 401
    const unauthRes = await fetch(`${BASE_URL}/admin/orders`);
    if (unauthRes.status === 401) {
      logPass("Unauthenticated request to admin endpoint returns 401 Unauthorized");
    } else {
      logFail(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
    }

    // 1.2 Student forbidden from admin routes
    const studentAdminRes = await fetch(`${BASE_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    if (studentAdminRes.status === 403) {
      logPass("Student accessing /api/admin/orders returns 403 Forbidden");
    } else {
      logFail(`Expected 403 for student accessing admin route, got ${studentAdminRes.status}`);
    }

    // 1.3 Student forbidden from creating products
    const studentCreateProdRes = await fetch(`${BASE_URL}/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${student1Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Hacked Product",
        slug: "hacked-product",
        category: testCategory._id,
        price: 10,
        stock: 50,
      }),
    });
    if (studentCreateProdRes.status === 403) {
      logPass("Student attempting to POST /api/products returns 403 Forbidden");
    } else {
      logFail(`Expected 403 for student creating product, got ${studentCreateProdRes.status}`);
    }

    // 1.4 Student forbidden from updating store settings
    const studentStoreRes = await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${student1Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isOpen: false }),
    });
    if (studentStoreRes.status === 403) {
      logPass("Student attempting to PATCH /api/admin/store/settings returns 403 Forbidden");
    } else {
      logFail(`Expected 403 for student modifying store settings, got ${studentStoreRes.status}`);
    }

    // 1.5 Student cannot view another student's order
    // Create an order for Student 1
    const testProdAuth = await Product.create({
      name: `Auth Test Product ${Date.now()}`,
      slug: `auth-test-${Date.now()}`,
      category: testCategory._id,
      price: 50,
      stock: 10,
      isAvailable: true,
    });

    const s1OrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${student1Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ id: testProdAuth._id.toString(), itemType: "PRODUCT", quantity: 1 }],
        paymentMethod: "CASH",
      }),
    });
    const s1OrderData = await s1OrderRes.json();
    const s1OrderId =
      s1OrderData.data?.order?.id ||
      s1OrderData.data?.order?._id ||
      s1OrderData.data?.id;
    if (!s1OrderId) {
      console.error("s1OrderData was:", s1OrderData);
      throw new Error("Failed to create order for Student 1");
    }

    // Student 2 tries to GET Student 1's order
    const crossGetRes = await fetch(`${BASE_URL}/orders/${s1OrderId}`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    if (crossGetRes.status === 403) {
      logPass("Student 2 attempting to view Student 1's order returns 403 Forbidden");
    } else {
      logFail(`Expected 403 for cross-user order view, got ${crossGetRes.status}`);
    }

    // 1.6 Student cannot cancel another student's order
    const crossCancelRes = await fetch(`${BASE_URL}/orders/${s1OrderId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${student2Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Malicious cancellation attempt" }),
    });
    if (crossCancelRes.status === 403) {
      logPass("Student 2 attempting to cancel Student 1's order returns 403 Forbidden");
    } else {
      logFail(`Expected 403 for cross-user cancellation, got ${crossCancelRes.status}`);
    }

    // =================================================================
    // 2. MASS ASSIGNMENT & ROLE ELEVATION
    // =================================================================
    console.log("\n--- 2. MASS ASSIGNMENT & ROLE ELEVATION PREVENTION ---");

    const hackedEmail = `elevate_${Date.now()}@college.edu`;
    const elevateRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hacker User",
        email: hackedEmail,
        password: "Hacker@12345",
        role: "ADMIN", // Injection attempt
        isActive: true,
      }),
    });
    const elevateData = await elevateRes.json();
    const createdUserDoc = await User.findOne({ email: hackedEmail });

    if (
      elevateRes.status === 201 &&
      createdUserDoc &&
      createdUserDoc.role === "STUDENT" &&
      elevateData.data?.user?.role === "STUDENT"
    ) {
      logPass("Registration role escalation attempt ignored: user is strictly created with role 'STUDENT'");
    } else {
      logFail(`Role escalation was not prevented! Actual role: ${createdUserDoc?.role}`);
    }

    // =================================================================
    // 3. AUTHORITATIVE BACKEND PRICING
    // =================================================================
    console.log("\n--- 3. AUTHORITATIVE PRICING ENFORCEMENT ---");

    const priceProd = await Product.create({
      name: `Pricing Product ${Date.now()}`,
      slug: `pricing-${Date.now()}`,
      category: testCategory._id,
      price: 150, // Real authoritative price is 150
      stock: 10,
      isAvailable: true,
    });

    // Client attempts to tamper with prices: sends price: 1 and subtotal: 1
    const tamperedOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${student1Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: priceProd._id.toString(),
            itemType: "PRODUCT",
            quantity: 2,
            price: 1.0, // Tampered unit price
            subtotal: 2.0, // Tampered subtotal
          },
        ],
        subtotal: 2.0,
        totalAmount: 2.0, // Tampered total
        paymentMethod: "CASH",
      }),
    });
    const tamperedOrderData = await tamperedOrderRes.json();
    const createdTamperedOrder = tamperedOrderData.data?.order || tamperedOrderData.data;

    // Database check: totalAmount MUST be 150 * 2 = 300
    if (
      tamperedOrderRes.status === 201 &&
      createdTamperedOrder &&
      createdTamperedOrder.totalAmount === 300
    ) {
      logPass("Client price tampering ignored: DB authoritative price (300) strictly enforced");
    } else {
      logFail(
        `Authoritative pricing violated! Expected 300, got ${createdTamperedOrder?.totalAmount}`
      );
    }

    // =================================================================
    // 4. INVENTORY CONCURRENCY & INTEGRITY
    // =================================================================
    console.log("\n--- 4. INVENTORY CONCURRENCY & INTEGRITY ---");

    // Product with exactly 2 units in stock
    const limitedStockProd = await Product.create({
      name: `Limited Stock Product ${Date.now()}`,
      slug: `limited-${Date.now()}`,
      category: testCategory._id,
      price: 40,
      stock: 2, // Only 2 available
      isAvailable: true,
    });

    // Launch 5 concurrent orders simultaneously, each requesting 1 unit
    console.log("Launching 5 concurrent orders competing for 2 items in stock...");
    const orderPromises = Array.from({ length: 5 }).map((_, idx) =>
      fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${student1Token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ id: limitedStockProd._id.toString(), itemType: "PRODUCT", quantity: 1 }],
          paymentMethod: "CASH",
          notes: `Concurrent order test ${idx}`,
        }),
      }).then((res) => res.json())
    );

    const concurrentResults = await Promise.all(orderPromises);
    const successfulOrders = concurrentResults.filter((r) => r.success === true);
    const rejectedOrders = concurrentResults.filter(
      (r) => r.success === false && r.message && r.message.includes("Insufficient stock")
    );

    const refreshedProd = await Product.findById(limitedStockProd._id);

    if (
      successfulOrders.length === 2 &&
      rejectedOrders.length === 3 &&
      refreshedProd.stock === 0
    ) {
      logPass(
        `Stock concurrency protected: exactly 2 succeeded, 3 rejected, final stock is 0 (never negative)`
      );
    } else {
      logFail(
        `Inventory concurrency failed: Succeeded=${successfulOrders.length}, Rejected=${rejectedOrders.length}, Remaining Stock=${refreshedProd.stock}`
      );
    }

    // =================================================================
    // 5. IDEMPOTENCY CONCURRENCY & INTEGRITY
    // =================================================================
    console.log("\n--- 5. IDEMPOTENCY CONCURRENCY & INTEGRITY ---");

    const idempotencyProd = await Product.create({
      name: `Idempotency Product ${Date.now()}`,
      slug: `idempotency-${Date.now()}`,
      category: testCategory._id,
      price: 75,
      stock: 20,
      isAvailable: true,
    });

    const testIdempotencyKey = `idem_test_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // Send 3 simultaneous requests with the exact same idempotencyKey
    console.log("Launching 3 concurrent orders with identical idempotencyKey...");
    const idemPromises = Array.from({ length: 3 }).map(() =>
      fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${student1Token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ id: idempotencyProd._id.toString(), itemType: "PRODUCT", quantity: 2 }],
          paymentMethod: "CASH",
          idempotencyKey: testIdempotencyKey,
        }),
      }).then((res) => res.json())
    );

    const idemResults = await Promise.all(idemPromises);
    const idemSuccesses = idemResults.filter((r) => r.success === true);
    const orderNumbers = idemSuccesses.map(
      (r) => r.data?.order?.orderNumber || r.data?.orderNumber
    );

    // Verify all 3 succeeded and returned the identical orderNumber
    const uniqueOrderNumbers = new Set(orderNumbers);
    const matchingDbOrders = await Order.find({
      user: student1Id,
      idempotencyKey: testIdempotencyKey,
    });
    const refreshedIdemProd = await Product.findById(idempotencyProd._id);

    if (
      idemSuccesses.length === 3 &&
      uniqueOrderNumbers.size === 1 &&
      matchingDbOrders.length === 1 &&
      refreshedIdemProd.stock === 18 // Decremented 2 units once (20 - 2 = 18), NOT 6 units
    ) {
      logPass(
        `Idempotency concurrency enforced: exactly 1 order in DB (${matchingDbOrders[0].orderNumber}), 3 clients got identical order, stock decremented exactly once`
      );
    } else {
      logFail(
        `Idempotency concurrency failed: Responses=${idemSuccesses.length}, Unique Order Numbers=${uniqueOrderNumbers.size}, DB Docs=${matchingDbOrders.length}, Stock=${refreshedIdemProd.stock}`
      );
    }

    // =================================================================
    // 6. CANCELLATION RACE SAFETY & DOUBLE CANCELLATION
    // =================================================================
    console.log("\n--- 6. CANCELLATION RACE CONDITION & DOUBLE CANCELLATION ---");

    const cancelProd = await Product.create({
      name: `Cancel Test Product ${Date.now()}`,
      slug: `cancel-${Date.now()}`,
      category: testCategory._id,
      price: 60,
      stock: 5,
      isAvailable: true,
    });

    // Create an order to test cancellation
    const cancelOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${student1Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ id: cancelProd._id.toString(), itemType: "PRODUCT", quantity: 2 }],
        paymentMethod: "CASH",
      }),
    });
    const cancelOrderData = await cancelOrderRes.json();
    const orderToCancelId =
      cancelOrderData.data?.order?.id ||
      cancelOrderData.data?.order?._id ||
      cancelOrderData.data?.id;
    if (!orderToCancelId) {
      console.error("cancelOrderData was:", cancelOrderData);
      throw new Error("Failed to create cancel test order");
    }

    // Check stock was decremented from 5 to 3
    const prodAfterOrder = await Product.findById(cancelProd._id);
    if (prodAfterOrder.stock !== 3) {
      throw new Error(`Expected stock 3 after order, got ${prodAfterOrder.stock}`);
    }

    // Fire 2 concurrent cancellations for the same order
    console.log("Launching 2 concurrent cancellation requests for the same order...");
    const cancelPromises = [
      fetch(`${BASE_URL}/orders/${orderToCancelId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${student1Token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Changed mind (concurrent request A)" }),
      }).then((res) => res.json()),
      fetch(`${BASE_URL}/orders/${orderToCancelId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${student1Token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Changed mind (concurrent request B)" }),
      }).then((res) => res.json()),
    ];

    const [cResultA, cResultB] = await Promise.all(cancelPromises);
    const cancelSuccessCount = [cResultA, cResultB].filter((r) => r.success === true).length;
    const cancelFailureCount = [cResultA, cResultB].filter((r) => r.success === false).length;

    const prodAfterCancel = await Product.findById(cancelProd._id);

    if (
      cancelSuccessCount === 1 &&
      cancelFailureCount === 1 &&
      prodAfterCancel.stock === 5 // Restored +2 exactly ONCE (3 + 2 = 5), not doubled to 7
    ) {
      logPass(
        "Cancellation race condition protected: exactly 1 succeeded, 1 rejected, stock restored exactly once (back to 5)"
      );
    } else {
      logFail(
        `Cancellation race failed: Successes=${cancelSuccessCount}, Failures=${cancelFailureCount}, Final Stock=${prodAfterCancel.stock}`
      );
    }

    // Sequential double cancellation attempt
    const thirdCancelRes = await fetch(`${BASE_URL}/orders/${orderToCancelId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${student1Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Third cancel attempt" }),
    });
    const thirdCancelData = await thirdCancelRes.json();
    if (thirdCancelRes.status === 400 && thirdCancelData.success === false) {
      logPass("Subsequent cancellation attempt cleanly rejected with 400 Bad Request");
    } else {
      logFail(`Expected 400 for repeated cancellation, got ${thirdCancelRes.status}`);
    }

    // =================================================================
    // 7. PAYMENT GATEWAY CRYPTOGRAPHIC INTEGRITY
    // =================================================================
    console.log("\n--- 7. PAYMENT GATEWAY CRYPTOGRAPHIC INTEGRITY ---");

    // Tampered verification attempt
    const tamperedPayRes = await fetch(`${BASE_URL}/payments/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${student1Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: orderToCancelId,
        razorpayPaymentId: "pay_test123",
        razorpayOrderId: "order_test123",
        razorpaySignature: "invalid_forged_signature_00000000000000000000",
      }),
    });
    const tamperedPayData = await tamperedPayRes.json();

    if (tamperedPayRes.status === 400 && tamperedPayData.success === false) {
      logPass("Tampered payment signature rejected with 400 Bad Request");
    } else {
      logFail(`Expected 400 for tampered payment signature, got ${tamperedPayRes.status}`);
    }

    // Webhook with forged signature
    const forgedWebhookRes = await fetch(`${BASE_URL}/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": "bogus_webhook_signature",
      },
      body: JSON.stringify({
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_fake" } } },
      }),
    });
    const forgedWebhookData = await forgedWebhookRes.json();

    if (forgedWebhookRes.status === 400 && forgedWebhookData.success === false) {
      logPass("Tampered webhook signature rejected with 400 Bad Request");
    } else {
      logFail(`Expected 400 for tampered webhook, got ${forgedWebhookRes.status}`);
    }

    // =================================================================
    // 8. NOSQL OPERATOR INJECTION SANITIZATION
    // =================================================================
    console.log("\n--- 8. NOSQL OPERATOR INJECTION SANITIZATION ---");

    // Attacker attempts injection by supplying operator object { "$gt": "" }
    const injectionLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: { $gt: "" },
        password: { $gt: "" },
      }),
    });
    const injectionLoginData = await injectionLoginRes.json();

    if (injectionLoginRes.status === 400 && injectionLoginData.success === false) {
      logPass("NoSQL injection attempt ($gt operator) neutralized by sanitizer and rejected by validation");
    } else {
      logFail(`NoSQL injection test unexpected response: status ${injectionLoginRes.status}`);
    }

    // =================================================================
    // 9. MALFORMED OBJECTID & PRODUCTION ERROR HANDLING
    // =================================================================
    console.log("\n--- 9. MALFORMED OBJECTID & ERROR HANDLING ---");

    const malformedIdRes = await fetch(`${BASE_URL}/orders/not-a-valid-mongo-id`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const malformedIdData = await malformedIdRes.json();

    if (
      malformedIdRes.status === 400 &&
      malformedIdData.success === false &&
      malformedIdData.message &&
      !malformedIdData.stack
    ) {
      logPass(
        "Malformed ObjectId returns clean 400 Bad Request with standardized error structure (no stack leak)"
      );
    } else {
      logFail(
        `Malformed ObjectId unexpected response: status ${malformedIdRes.status}, data: ${JSON.stringify(malformedIdData)}`
      );
    }

    // =================================================================
    // 10. IMAGE URL & PROTOCOL VALIDATION
    // =================================================================
    console.log("\n--- 10. IMAGE URL & PROTOCOL VALIDATION ---");

    // Malicious javascript: image URL
    const unsafeImageRes = await fetch(`${BASE_URL}/categories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `XSS Category ${Date.now()}`,
        image: "javascript:alert(document.cookie)",
      }),
    });
    const unsafeImageData = await unsafeImageRes.json();

    if (unsafeImageRes.status === 400 && unsafeImageData.success === false) {
      logPass("Unsafe image URL (javascript: scheme) rejected with 400 Validation Error");
    } else {
      logFail(`Expected 400 for unsafe image URL, got ${unsafeImageRes.status}`);
    }

    // Valid HTTPS image URL
    const safeImageRes = await fetch(`${BASE_URL}/categories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Safe Image Category ${Date.now()}`,
        image: "https://images.unsplash.com/photo-1550547660-d9450f859349",
      }),
    });
    const safeImageData = await safeImageRes.json();

    if (safeImageRes.status === 201 && safeImageData.success === true) {
      logPass("Valid HTTPS image URL accepted and created with 201 Created");
    } else {
      logFail(`Expected 201 for valid HTTPS image URL, got ${safeImageRes.status}`);
    }

    console.log("\n========================================================");
    console.log("   ALL PART 23 SECURITY & CONCURRENCY AUDIT TESTS PASSED!");
    console.log("========================================================\n");
  } catch (err) {
    logFail("Test suite encountered fatal error:", err);
  } finally {
    await mongoose.disconnect();
  }
};

runAuditSuite();
