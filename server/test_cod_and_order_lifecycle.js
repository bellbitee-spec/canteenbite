require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const http = require("http");
const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const connectDB = require("./src/config/db");
const app = require("./src/app");
const env = require("./src/config/env");

const User = require("./src/models/User");
const Product = require("./src/models/Product");
const Category = require("./src/models/Category");
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

// Track created entities for zero side-effects cleanup
const cleanup = {
  users: [],
  categories: [],
  products: [],
  orders: [],
  orderItems: [],
  payments: [],
};

const runSuite = async () => {
  console.log("\n==================================================================");
  console.log("   BELLBITE — END-TO-END ORDER LIFECYCLE & COD VERIFICATION SUITE");
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

    // Ensure store is open
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
        storeName: "BellBite Test Canteen",
        isOpen: true,
        manualOverride: true,
        acceptingOrders: true,
        cancellationWindowSeconds: 30,
      });
    }

    const testTag = Date.now();
    const hashedPassword = await bcrypt.hash("Test@12345", 10);
    const jwtSecret = env.JWT_SECRET || process.env.JWT_SECRET;

    // 1. Create Student A
    const studentA = await User.create({
      name: "Student Alpha",
      email: `student_alpha_${testTag}@college.edu`,
      password: hashedPassword,
      role: "STUDENT",
    });
    cleanup.users.push(studentA._id);
    const tokenA = jwt.sign({ id: studentA._id, role: studentA.role }, jwtSecret, { expiresIn: "1h" });

    // 2. Create Student B
    const studentB = await User.create({
      name: "Student Beta",
      email: `student_beta_${testTag}@college.edu`,
      password: hashedPassword,
      role: "STUDENT",
    });
    cleanup.users.push(studentB._id);
    const tokenB = jwt.sign({ id: studentB._id, role: studentB.role }, jwtSecret, { expiresIn: "1h" });

    // 3. Create Admin
    const adminUser = await User.create({
      name: "Canteen Admin",
      email: `canteen_admin_${testTag}@college.edu`,
      password: hashedPassword,
      role: "ADMIN",
    });
    cleanup.users.push(adminUser._id);
    const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, jwtSecret, { expiresIn: "1h" });

    // 4. Create Category & Product
    const testCat = await Category.create({
      name: `Snacks ${testTag}`,
      slug: `snacks-${testTag}`,
      displayOrder: 1,
    });
    cleanup.categories.push(testCat._id);

    const testProduct = await Product.create({
      name: `Vada Pav Special ${testTag}`,
      slug: `vada-pav-special-${testTag}`,
      price: 45,
      stock: 50,
      category: testCat._id,
      isAvailable: true,
    });
    cleanup.products.push(testProduct._id);

    console.log("Seed data initialized successfully.\n");

    // -----------------------------------------------------------------
    // TEST 1: Student creates COD Order
    // -----------------------------------------------------------------
    console.log("--- TEST 1: Student creates COD Order ---");
    const codRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 2 }],
        paymentMethod: "COD",
        notes: "Extra spicy chutney please",
      }),
    });

    const codData = await codRes.json();
    if (codRes.status !== 201) {
      throw new Error(`Expected HTTP 201 for COD order, got ${codRes.status}: ${JSON.stringify(codData)}`);
    }

    const codOrder = codData.data?.order || codData.order || codData.data;
    const codOrderId = codOrder.id || codOrder._id;
    cleanup.orders.push(codOrderId);

    logPass(1, `Student created COD order #${codOrder.orderNumber || codOrderId.slice(-6)} successfully (HTTP 201)`);

    // -----------------------------------------------------------------
    // TEST 2: Verify Initial Payment & Order Status in DB
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: Verify DB State on COD Order Creation ---");
    const dbOrder = await Order.findById(codOrderId);
    if (!dbOrder) throw new Error("COD Order not found in database.");

    if (dbOrder.paymentMethod !== "COD") {
      throw new Error(`Expected paymentMethod 'COD', got '${dbOrder.paymentMethod}'`);
    }
    if (dbOrder.paymentStatus !== "PENDING") {
      throw new Error(`Expected initial paymentStatus 'PENDING', got '${dbOrder.paymentStatus}' (Must NEVER be marked PAID on creation)`);
    }
    if (dbOrder.orderStatus !== "PENDING") {
      throw new Error(`Expected initial orderStatus 'PENDING', got '${dbOrder.orderStatus}'`);
    }
    if (dbOrder.totalAmount !== 90) {
      throw new Error(`Expected totalAmount 90 (2 x 45), got ${dbOrder.totalAmount}`);
    }

    logPass(2, "Database confirms: paymentMethod='COD', paymentStatus='PENDING', orderStatus='PENDING', total=90");

    // -----------------------------------------------------------------
    // TEST 3: Admin Queries Orders Queue (Filter by COD)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: Admin queries orders with COD filter ---");
    const adminOrdersRes = await fetch(`${baseUrl}/admin/orders?paymentMethod=COD`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const adminOrdersData = await adminOrdersRes.json();
    if (adminOrdersRes.status !== 200) {
      throw new Error(`Admin fetch failed with status ${adminOrdersRes.status}: ${JSON.stringify(adminOrdersData)}`);
    }

    const fetchedOrders = adminOrdersData.data?.orders || adminOrdersData.orders || [];
    const foundInQueue = fetchedOrders.some(
      (o) => (o.id || o._id)?.toString() === codOrderId.toString()
    );

    if (!foundInQueue) {
      throw new Error(`Newly created COD order ${codOrderId} not found in admin queue query with paymentMethod=COD`);
    }

    logPass(3, `Admin order queue successfully retrieved COD order with paymentMethod=COD filter`);

    // -----------------------------------------------------------------
    // TEST 4: Admin Accepts COD Order (Status -> CONFIRMED, Payment stays PENDING)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 4: Admin Accepts COD Order ---");
    const acceptRes = await fetch(`${baseUrl}/admin/orders/${codOrderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: "CONFIRMED",
        preparationTime: 12,
      }),
    });

    const acceptData = await acceptRes.json();
    if (acceptRes.status !== 200) {
      throw new Error(`Admin accept failed with status ${acceptRes.status}: ${JSON.stringify(acceptData)}`);
    }

    const acceptedDbOrder = await Order.findById(codOrderId);
    if (acceptedDbOrder.orderStatus !== "CONFIRMED") {
      throw new Error(`Expected orderStatus 'CONFIRMED', got '${acceptedDbOrder.orderStatus}'`);
    }
    if (acceptedDbOrder.paymentStatus !== "PENDING") {
      throw new Error(`CRITICAL: paymentStatus was altered to '${acceptedDbOrder.paymentStatus}' upon admin acceptance! It must remain PENDING for COD.`);
    }

    logPass(4, "Admin accepted order: orderStatus updated to CONFIRMED, paymentStatus correctly remains PENDING");

    // -----------------------------------------------------------------
    // TEST 5: Advance Kitchen Stages (CONFIRMED -> PREPARING -> READY)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 5: Advance Kitchen Stages ---");
    const prepRes = await fetch(`${baseUrl}/admin/orders/${codOrderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "PREPARING" }),
    });
    if (prepRes.status !== 200) throw new Error(`Transition to PREPARING failed: ${prepRes.status}`);

    const readyRes = await fetch(`${baseUrl}/admin/orders/${codOrderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "READY" }),
    });
    if (readyRes.status !== 200) throw new Error(`Transition to READY failed: ${readyRes.status}`);

    const readyDbOrder = await Order.findById(codOrderId);
    if (readyDbOrder.orderStatus !== "READY") {
      throw new Error(`Expected orderStatus 'READY', got '${readyDbOrder.orderStatus}'`);
    }
    logPass(5, "Order progressed smoothly through CONFIRMED -> PREPARING -> READY");

    // -----------------------------------------------------------------
    // TEST 6: Admin Records Cash Payment (Collection at Counter)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 6: Admin Records Cash Payment ---");
    const recordPayRes = await fetch(`${baseUrl}/admin/orders/${codOrderId}/payment`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ paymentStatus: "PAID" }),
    });

    const recordPayData = await recordPayRes.json();
    if (recordPayRes.status !== 200) {
      throw new Error(`Admin recordPayment returned status ${recordPayRes.status}: ${JSON.stringify(recordPayData)}`);
    }

    const paidDbOrder = await Order.findById(codOrderId);
    if (paidDbOrder.paymentStatus !== "PAID") {
      throw new Error(`Expected order paymentStatus 'PAID', got '${paidDbOrder.paymentStatus}'`);
    }

    const paymentRecord = await Payment.findOne({ order: codOrderId });
    if (!paymentRecord) {
      throw new Error("No Payment ledger document created for recorded cash payment");
    }
    cleanup.payments.push(paymentRecord._id);

    if (paymentRecord.status !== "PAID" || paymentRecord.method !== "COD") {
      throw new Error(`Payment record mismatch: method='${paymentRecord.method}', status='${paymentRecord.status}'`);
    }

    logPass(6, "Cash payment recorded successfully: order.paymentStatus='PAID' and Payment record created (method='COD', status='PAID')");

    // -----------------------------------------------------------------
    // TEST 7: Role Authorization Enforcement (403/401 Checks)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 7: Role Authorization Enforcement ---");
    // Student token attempting to change status
    const studentStatusAttempt = await fetch(`${baseUrl}/admin/orders/${codOrderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    if (studentStatusAttempt.status === 403) {
      logPass(7.1, "Unauthorized student rejected from changing order status (HTTP 403 Forbidden)");
    } else {
      throw new Error(`Expected 403 for student status change attempt, got ${studentStatusAttempt.status}`);
    }

    // Student token attempting to record payment
    const studentPaymentAttempt = await fetch(`${baseUrl}/admin/orders/${codOrderId}/payment`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ paymentStatus: "PAID" }),
    });
    if (studentPaymentAttempt.status === 403) {
      logPass(7.2, "Unauthorized student rejected from recording payment (HTTP 403 Forbidden)");
    } else {
      throw new Error(`Expected 403 for student payment recording attempt, got ${studentPaymentAttempt.status}`);
    }

    // Unauthenticated request
    const unauthAttempt = await fetch(`${baseUrl}/admin/orders/${codOrderId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "PAID" }),
    });
    if (unauthAttempt.status === 401) {
      logPass(7.3, "Unauthenticated request without token rejected (HTTP 401 Unauthorized)");
    } else {
      throw new Error(`Expected 401 for missing token, got ${unauthAttempt.status}`);
    }

    // -----------------------------------------------------------------
    // TEST 8: Cross-User Isolation (Student B cannot access Student A's order)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 8: Cross-User Isolation ---");
    const crossViewRes = await fetch(`${baseUrl}/orders/${codOrderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });
    if (crossViewRes.status === 403 || crossViewRes.status === 404) {
      logPass(8.1, `Student B prevented from viewing Student A's order (HTTP ${crossViewRes.status})`);
    } else {
      throw new Error(`Security violation: Student B accessed Student A's order with status ${crossViewRes.status}`);
    }

    const crossCancelRes = await fetch(`${baseUrl}/orders/${codOrderId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ reason: "Malicious attempt to cancel" }),
    });
    if (crossCancelRes.status === 403 || crossCancelRes.status === 404 || crossCancelRes.status === 400) {
      logPass(8.2, `Student B prevented from cancelling Student A's order (HTTP ${crossCancelRes.status})`);
    } else {
      throw new Error(`Security violation: Student B cancelled Student A's order with status ${crossCancelRes.status}`);
    }

    // -----------------------------------------------------------------
    // TEST 9: Invalid Status Transition Enforcement
    // -----------------------------------------------------------------
    console.log("\n--- TEST 9: Invalid Status Transition Rejection ---");
    // Create another fresh order in PENDING
    const freshOrderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 1 }],
        paymentMethod: "COD",
      }),
    });
    const freshOrderData = await freshOrderRes.json();
    const freshOrder = freshOrderData.data?.order || freshOrderData.order || freshOrderData.data;
    const freshOrderId = freshOrder.id || freshOrder._id;
    cleanup.orders.push(freshOrderId);

    // Try to jump from PENDING directly to READY (bypassing CONFIRMED / PREPARING)
    const invalidJumpRes = await fetch(`${baseUrl}/admin/orders/${freshOrderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "READY" }),
    });
    const invalidJumpData = await invalidJumpRes.json();

    if (invalidJumpRes.status === 400) {
      logPass(9, `Invalid status jump (PENDING -> READY) safely rejected with HTTP 400: "${invalidJumpData.message}"`);
    } else {
      throw new Error(`Expected HTTP 400 for invalid jump, got ${invalidJumpRes.status}`);
    }

    // -----------------------------------------------------------------
    // TEST 10: COD Orders Do Not Trigger Gateway Payment Gateway Calls
    // -----------------------------------------------------------------
    console.log("\n--- TEST 10: COD Orders Reject Razorpay Gateway Order Creation ---");
    const gatewayAttemptRes = await fetch(`${baseUrl}/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ orderId: freshOrderId }),
    });
    const gatewayAttemptData = await gatewayAttemptRes.json();

    if (gatewayAttemptRes.status === 400) {
      logPass(10, `Gateway creation rejected for COD order (HTTP 400): "${gatewayAttemptData.message}"`);
    } else {
      throw new Error(`Expected HTTP 400 when attempting gateway creation for COD order, got ${gatewayAttemptRes.status}`);
    }

    // -----------------------------------------------------------------
    // TEST 11: Idempotency Protection for Order Creation
    // -----------------------------------------------------------------
    console.log("\n--- TEST 11: Idempotency Protection ---");
    const idempotencyKey = `idem_${testTag}_${crypto.randomBytes(4).toString("hex")}`;
    const initialStock = (await Product.findById(testProduct._id)).stock;

    // First submission
    const idemFirstRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 1 }],
        paymentMethod: "COD",
      }),
    });
    const idemFirstData = await idemFirstRes.json();
    const idemFirstOrder = idemFirstData.data?.order || idemFirstData.order || idemFirstData.data;
    const idemFirstId = idemFirstOrder.id || idemFirstOrder._id;
    cleanup.orders.push(idemFirstId);

    const stockAfterFirst = (await Product.findById(testProduct._id)).stock;
    if (stockAfterFirst !== initialStock - 1) {
      throw new Error(`Stock decrement failed: expected ${initialStock - 1}, got ${stockAfterFirst}`);
    }

    // Second submission with exact same Idempotency-Key
    const idemSecondRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct._id, quantity: 1 }],
        paymentMethod: "COD",
      }),
    });
    const idemSecondData = await idemSecondRes.json();
    const idemSecondOrder = idemSecondData.data?.order || idemSecondData.order || idemSecondData.data;
    const idemSecondId = idemSecondOrder.id || idemSecondOrder._id;

    if (idemSecondId.toString() !== idemFirstId.toString()) {
      throw new Error(`Idempotency failure: second request created a new order ${idemSecondId} instead of returning ${idemFirstId}`);
    }

    const stockAfterSecond = (await Product.findById(testProduct._id)).stock;
    if (stockAfterSecond !== stockAfterFirst) {
      throw new Error(`Idempotency double-spend bug: stock decremented again! Before: ${stockAfterFirst}, After: ${stockAfterSecond}`);
    }

    logPass(11, `Idempotency verified: re-submission returned same order #${idemFirstOrder.orderNumber || idemFirstId.slice(-6)} without double-decrementing stock`);

    console.log("\n==================================================================");
    console.log("   ALL 11 END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY! ✔");
    console.log("==================================================================\n");

  } catch (err) {
    console.error("\n❌ SUITE EXECUTION FAILED WITH ERROR:\n", err);
    process.exitCode = 1;
  } finally {
    console.log("Starting teardown & cleanup of test data...");

    try {
      if (cleanup.payments.length > 0) {
        await Payment.deleteMany({ _id: { $in: cleanup.payments } });
      }
      if (cleanup.orders.length > 0) {
        await OrderItem.deleteMany({ order: { $in: cleanup.orders } });
        await Order.deleteMany({ _id: { $in: cleanup.orders } });
      }
      if (cleanup.products.length > 0) {
        await Product.deleteMany({ _id: { $in: cleanup.products } });
      }
      if (cleanup.categories.length > 0) {
        await Category.deleteMany({ _id: { $in: cleanup.categories } });
      }
      if (cleanup.users.length > 0) {
        await User.deleteMany({ _id: { $in: cleanup.users } });
      }
      if (originalSettings) {
        await StoreSettings.updateOne({}, { $set: originalSettings });
      }
      console.log("Teardown completed cleanly. No orphaned test data remains.\n");
    } catch (cleanupErr) {
      console.error("Warning: Cleanup error:", cleanupErr.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  }
};

runSuite();
