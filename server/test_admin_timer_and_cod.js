require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const http = require("http");
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

// Track created entities for teardown
const cleanup = {
  users: [],
  categories: [],
  products: [],
  orders: [],
  orderItems: [],
  payments: [],
};

const makeRequest = (url, options = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
};

const extractOrder = (res) => res.data?.data?.order || res.data?.order;

const runSuite = async () => {
  console.log("\n==================================================================");
  console.log("   BELLBITE — ADMIN TIMER & COD COMPREHENSIVE VERIFICATION SUITE");
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

    // Create Student A
    const studentUserA = await User.create({
      name: `Test Student A ${testTag}`,
      email: `studentA_${testTag}@bellbite.test`,
      password: hashedPassword,
      role: "STUDENT",
      isActive: true,
      isEmailVerified: true,
    });
    cleanup.users.push(studentUserA._id);
    const studentAToken = jwt.sign(
      { id: studentUserA._id.toString(), role: "STUDENT" },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // Create Student B
    const studentUserB = await User.create({
      name: `Test Student B ${testTag}`,
      email: `studentB_${testTag}@bellbite.test`,
      password: hashedPassword,
      role: "STUDENT",
      isActive: true,
      isEmailVerified: true,
    });
    cleanup.users.push(studentUserB._id);
    const studentBToken = jwt.sign(
      { id: studentUserB._id.toString(), role: "STUDENT" },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // Create Admin
    const adminUser = await User.create({
      name: `Test Admin ${testTag}`,
      email: `admin_${testTag}@bellbite.test`,
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      isEmailVerified: true,
    });
    cleanup.users.push(adminUser._id);
    const adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: "ADMIN" },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // Create Category & Product with required fields
    const category = await Category.create({
      name: `Test Snacks ${testTag}`,
      slug: `test-snacks-${testTag}`,
      isActive: true,
    });
    cleanup.categories.push(category._id);

    const product = await Product.create({
      name: `Sakura Bento ${testTag}`,
      slug: `sakura-bento-${testTag}`,
      description: "Crispy bento meal",
      price: 120,
      category: category._id,
      isAvailable: true,
      stock: 50,
      preparationTime: 15,
    });
    cleanup.products.push(product._id);

    let createdOrderId = null;
    let initialReadyAt = null;

    // -------------------------------------------------------------------------
    // TEST 1: Student places COD order with BB- prefix, PENDING payment, 15m prep
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(
        `${baseUrl}/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${studentAToken}`,
          },
        },
        {
          items: [{ itemType: "PRODUCT", id: product._id.toString(), quantity: 2 }],
          paymentMethod: "COD",
          notes: "Extra napkins please",
        }
      );

      if (res.status !== 201) {
        throw new Error(`Expected HTTP 201, got ${res.status}: ${JSON.stringify(res.data)}`);
      }

      const orderData = extractOrder(res);
      if (!orderData) {
        throw new Error(`Missing order in response: ${JSON.stringify(res.data)}`);
      }
      createdOrderId = orderData.id || orderData._id;
      cleanup.orders.push(createdOrderId);

      // Verify orderNumber format: BB-YYYYMMDD-XXXXXX
      const orderNumber = orderData.orderNumber;
      if (!orderNumber || !orderNumber.startsWith("BB-")) {
        throw new Error(`Expected orderNumber to start with 'BB-', got: ${orderNumber}`);
      }

      // Verify payment details: COD, PENDING
      if (orderData.paymentMethod !== "COD") {
        throw new Error(`Expected paymentMethod 'COD', got: ${orderData.paymentMethod}`);
      }
      if (orderData.paymentStatus !== "PENDING") {
        throw new Error(`Expected paymentStatus 'PENDING', got: ${orderData.paymentStatus}`);
      }

      // Verify prep timing fields: 15 mins default
      if (orderData.estimatedPreparationMinutes !== 15) {
        throw new Error(
          `Expected estimatedPreparationMinutes 15, got: ${orderData.estimatedPreparationMinutes}`
        );
      }
      if (!orderData.estimatedReadyAt) {
        throw new Error("Missing estimatedReadyAt timestamp on created order");
      }
      initialReadyAt = new Date(orderData.estimatedReadyAt).getTime();
      const createdAt = new Date(orderData.createdAt).getTime();
      const expectedReadyDiff = Math.round((initialReadyAt - createdAt) / 60000);
      if (expectedReadyDiff < 14 || expectedReadyDiff > 16) {
        throw new Error(`Expected ready diff around 15m, got ${expectedReadyDiff}m`);
      }

      logPass(
        1,
        `Student places COD order (ID: ${orderNumber}, paymentStatus: PENDING, prep: 15m, readyAt set)`
      );
    } catch (err) {
      logFail(1, "Student places COD order", err);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Admin views order in queue with matching ID and prep fields
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(`${baseUrl}/admin/orders/${createdOrderId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
      }

      const adminOrder = extractOrder(res);
      if (!adminOrder) {
        throw new Error(`Missing order in admin response: ${JSON.stringify(res.data)}`);
      }
      if (adminOrder.paymentMethod !== "COD") {
        throw new Error(`Admin view paymentMethod mismatch: ${adminOrder.paymentMethod}`);
      }
      if (adminOrder.paymentStatus !== "PENDING") {
        throw new Error(`Admin view paymentStatus mismatch: ${adminOrder.paymentStatus}`);
      }
      if (!adminOrder.orderNumber.startsWith("BB-")) {
        throw new Error(`Admin view orderNumber mismatch: ${adminOrder.orderNumber}`);
      }
      if (adminOrder.estimatedPreparationMinutes !== 15) {
        throw new Error(`Admin view prep mins mismatch: ${adminOrder.estimatedPreparationMinutes}`);
      }

      logPass(2, "Admin views order queue with authoritative BB- ID, COD status, and 15m prep timer");
    } catch (err) {
      logFail(2, "Admin views order queue", err);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Admin confirms/accepts order (payment remains PENDING)
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(
        `${baseUrl}/admin/orders/${createdOrderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        },
        { status: "CONFIRMED" }
      );

      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
      }

      const updated = extractOrder(res);
      if (updated.orderStatus !== "CONFIRMED") {
        throw new Error(`Expected status CONFIRMED, got: ${updated.orderStatus}`);
      }
      // COD payment must NEVER falsely confirm as PAID upon acceptance
      if (updated.paymentStatus !== "PENDING") {
        throw new Error(`COD order falsely confirmed payment: ${updated.paymentStatus}`);
      }

      logPass(3, "Admin accepts order -> status CONFIRMED, COD payment remains strictly PENDING");
    } catch (err) {
      logFail(3, "Admin accepts order", err);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Admin starts prep (PREPARING) -> cancellation window closes
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(
        `${baseUrl}/admin/orders/${createdOrderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        },
        { status: "PREPARING" }
      );

      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
      }

      const updated = extractOrder(res);
      if (updated.orderStatus !== "PREPARING") {
        throw new Error(`Expected PREPARING, got: ${updated.orderStatus}`);
      }
      if (updated.cancellationWindowOpen !== false) {
        throw new Error("cancellationWindowOpen must be false once PREPARING begins");
      }

      // Verify student cancellation is now rejected
      const cancelRes = await makeRequest(
        `${baseUrl}/orders/${createdOrderId}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${studentAToken}`,
          },
        },
        { reason: "Changed mind" }
      );

      if (cancelRes.status !== 400) {
        throw new Error(
          `Expected 400 when cancelling active PREPARING order, got: ${cancelRes.status}`
        );
      }

      logPass(4, "Admin starts prep -> status PREPARING closes cancellation window, rejects student cancel");
    } catch (err) {
      logFail(4, "Admin starts prep", err);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Admin increases preparation time by +5 min
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(
        `${baseUrl}/admin/orders/${createdOrderId}/preparation-time`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        },
        { adjustmentMinutes: 5 }
      );

      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
      }

      const updated = extractOrder(res);
      if (updated.estimatedPreparationMinutes !== 20) {
        throw new Error(
          `Expected estimatedPreparationMinutes 20 (+5m), got: ${updated.estimatedPreparationMinutes}`
        );
      }

      const newReadyAt = new Date(updated.estimatedReadyAt).getTime();
      const diffMs = newReadyAt - initialReadyAt;
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins !== 5) {
        throw new Error(`Expected readyAt shifted by +5m, shifted by ${diffMins}m`);
      }

      logPass(5, `Admin adds +5 min -> prep time updated to 20m, ready target shifted by 5m`);
    } catch (err) {
      logFail(5, "Admin adds +5 min", err);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Admin decreases preparation time by -5 min
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(
        `${baseUrl}/admin/orders/${createdOrderId}/preparation-time`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        },
        { adjustmentMinutes: -5 }
      );

      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
      }

      const updated = extractOrder(res);
      if (updated.estimatedPreparationMinutes !== 15) {
        throw new Error(
          `Expected estimatedPreparationMinutes 15 (-5m), got: ${updated.estimatedPreparationMinutes}`
        );
      }

      logPass(6, "Admin decreases prep time by -5 min -> restored back to 15m");
    } catch (err) {
      logFail(6, "Admin decreases prep time by -5 min", err);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Admin sets custom remaining minutes
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(
        `${baseUrl}/admin/orders/${createdOrderId}/preparation-time`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        },
        { remainingMinutes: 12 }
      );

      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
      }

      const updated = extractOrder(res);
      const now = Date.now();
      const newReadyAt = new Date(updated.estimatedReadyAt).getTime();
      const remainingCalc = Math.round((newReadyAt - now) / 60000);
      if (remainingCalc < 11 || remainingCalc > 13) {
        throw new Error(`Expected ~12m remaining, got ${remainingCalc}m`);
      }

      logPass(7, `Admin sets custom remaining minutes (12 min) -> estimatedReadyAt synchronized`);
    } catch (err) {
      logFail(7, "Admin sets custom remaining minutes", err);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Rejects invalid adjustments (reducing into the past < 1m)
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(
        `${baseUrl}/admin/orders/${createdOrderId}/preparation-time`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        },
        { adjustmentMinutes: -50 } // Cannot reduce past now
      );

      if (res.status !== 400) {
        throw new Error(`Expected 400 Bad Request for excessive reduction, got ${res.status}`);
      }

      logPass(8, "Rejects invalid timer reduction that would set ready time in the past (< 1 min)");
    } catch (err) {
      logFail(8, "Rejects invalid timer reduction", err);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Security: Students cannot adjust preparation time (403 Forbidden)
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(
        `${baseUrl}/admin/orders/${createdOrderId}/preparation-time`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${studentAToken}`,
          },
        },
        { adjustmentMinutes: 5 }
      );

      if (res.status !== 403) {
        throw new Error(`Expected 403 Forbidden for non-admin, got: ${res.status}`);
      }

      logPass(9, "Security: Non-admin student blocked from adjusting prep time (403 Forbidden)");
    } catch (err) {
      logFail(9, "Security: Non-admin prep adjustment blocked", err);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Security: Student B cannot view Student A's order
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(`${baseUrl}/orders/${createdOrderId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${studentBToken}` },
      });

      if (res.status !== 404 && res.status !== 403) {
        throw new Error(`Expected 404/403 for unauthorized order access, got: ${res.status}`);
      }

      logPass(10, "Security: Student B cannot access Student A's order details (404/403 isolation)");
    } catch (err) {
      logFail(10, "Security: Cross-student order access", err);
    }

    // -------------------------------------------------------------------------
    // TEST 11: Admin marks READY and records Cash Collection (paymentStatus -> PAID)
    // -------------------------------------------------------------------------
    try {
      // 1. Mark ready
      const readyRes = await makeRequest(
        `${baseUrl}/admin/orders/${createdOrderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        },
        { status: "READY" }
      );
      if (readyRes.status !== 200) {
        throw new Error(`Failed to mark READY: ${readyRes.status}`);
      }

      // 2. Collect cash payment
      const payRes = await makeRequest(
        `${baseUrl}/admin/orders/${createdOrderId}/payment`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        },
        { paymentStatus: "PAID" }
      );
      if (payRes.status !== 200) {
        throw new Error(`Failed to record payment: ${payRes.status}`);
      }

      const updated = extractOrder(payRes);
      if (updated.paymentStatus !== "PAID") {
        throw new Error(`Expected paymentStatus PAID, got: ${updated.paymentStatus}`);
      }

      // 3. Mark COMPLETED
      const completeRes = await makeRequest(
        `${baseUrl}/admin/orders/${createdOrderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        },
        { status: "COMPLETED" }
      );
      if (completeRes.status !== 200) {
        throw new Error(`Failed to mark COMPLETED: ${completeRes.status}`);
      }

      logPass(11, "Admin marks READY -> records COD cash payment as PAID -> marks COMPLETED");
    } catch (err) {
      logFail(11, "Admin marks READY and collects COD payment", err);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Rejects prep adjustments on closed (COMPLETED) orders
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(
        `${baseUrl}/admin/orders/${createdOrderId}/preparation-time`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        },
        { adjustmentMinutes: 5 }
      );

      if (res.status !== 400) {
        throw new Error(`Expected 400 Bad Request on completed order, got: ${res.status}`);
      }

      logPass(12, "Rejects prep adjustments on closed/completed orders (400 Bad Request)");
    } catch (err) {
      logFail(12, "Rejects prep adjustments on closed orders", err);
    }
  } catch (globalErr) {
    console.error("Global Test Suite Error:", globalErr);
    process.exitCode = 1;
  } finally {
    // Teardown created test entities
    console.log("\nTearing down test artifacts...");
    try {
      if (cleanup.orders.length) {
        await Order.deleteMany({ _id: { $in: cleanup.orders } });
        await OrderItem.deleteMany({ orderId: { $in: cleanup.orders } });
      }
      if (cleanup.products.length) {
        await Product.deleteMany({ _id: { $in: cleanup.products } });
      }
      if (cleanup.categories.length) {
        await Category.deleteMany({ _id: { $in: cleanup.categories } });
      }
      if (cleanup.users.length) {
        await User.deleteMany({ _id: { $in: cleanup.users } });
      }
      if (originalSettings && StoreSettings) {
        const doc = await StoreSettings.findOne();
        if (doc) {
          await StoreSettings.updateOne({ _id: doc._id }, { $set: originalSettings });
        }
      }
      console.log("Teardown completed cleanly.");
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
    console.log("\n==================================================================");
    console.log(process.exitCode === 1 ? "   ❌ TEST SUITE FAILED" : "   ✔ ALL TESTS PASSED SUCCESSFULLY");
    console.log("==================================================================\n");
  }
};

runSuite();
