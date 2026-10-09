require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const env = require("./src/config/env");

const User = require("./src/models/User");
const Product = require("./src/models/Product");
const Category = require("./src/models/Category");
const Combo = require("./src/models/Combo");
const Order = require("./src/models/Order");
const OrderItem = require("./src/models/OrderItem");
const Payment = require("./src/models/Payment");
const StoreSettings = require("./src/models/StoreSettings");

const {
  createOrder,
  cancelOrder,
  adminCancelOrder,
  systemCancelUnpaidOrder,
  cleanupAbandonedOnlineOrders,
  checkTransactionSupport,
} = require("./src/services/orderService");
const { processOrderRefund } = require("./src/services/paymentService");

const logPass = (num, title) => console.log(`\x1b[32m✔ [TEST ${num}] PASS:\x1b[0m ${title}`);
const logFail = (num, title, err) => {
  console.error(`\x1b[31m✖ [TEST ${num}] FAIL:\x1b[0m ${title}`);
  if (err) console.error(err);
  process.exitCode = 1;
};

// Track created IDs for isolated teardown
const cleanup = {
  users: [],
  categories: [],
  products: [],
  combos: [],
  orders: [],
  orderItems: [],
  payments: [],
};

const runAtlasIntegrityTests = async () => {
  console.log("\n==================================================================");
  console.log("   PART 26 — ATLAS CONNECTION, CONCURRENCY & INTEGRITY TEST SUITE");
  console.log("==================================================================\n");

  let originalSettings = null;

  try {
    // -------------------------------------------------------------
    // TEST 1: Atlas Connection & Startup Failure Handling
    // -------------------------------------------------------------
    console.log("--- TEST 1: Atlas Connection & Startup Failure Handling ---");
    const connection = await connectDB();
    if (!connection || !mongoose.connection.readyState) {
      throw new Error("Failed to connect to MongoDB Atlas");
    }
    logPass(1.1, `Connected to Atlas cluster: ${mongoose.connection.host}`);

    // 1.2 Verify empty/missing URI throws authoritative error
    let missingUriThrew = false;
    try {
      await connectDB("");
    } catch (missingErr) {
      missingUriThrew = true;
      logPass(1.2, `Startup validation caught missing/empty URI: "${missingErr.message}"`);
    }
    if (!missingUriThrew) {
      throw new Error("Expected empty URI to throw validation error");
    }

    // 1.3 Verify unreachable cluster fails safely without crashing process
    let badConnThrew = false;
    try {
      const { execSync } = require("child_process");
      execSync(
        `node -e "const connectDB = require('./src/config/db'); connectDB('mongodb://nonexistent-host-xyz:27017/test?serverSelectionTimeoutMS=1000').then(() => process.exit(1)).catch(() => process.exit(0));"`,
        { cwd: __dirname, timeout: 6000 }
      );
      badConnThrew = true;
      logPass(1.3, "Unreachable host fails safely and returns clear error without unhandled crash");
    } catch (err) {
      if (err.status === 0) {
        badConnThrew = true;
        logPass(1.3, "Unreachable host fails safely and returns clear error without unhandled crash");
      } else {
        throw new Error("Expected unreachable host connection to reject, but it exited non-zero or timed out: " + err.message);
      }
    }

    // Ensure store is open during test execution
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
            cancellationWindowSeconds: 60,
          },
        }
      );
    } else {
      settingsDoc = await StoreSettings.create({
        storeName: "Test Canteen",
        isOpen: true,
        manualOverride: true,
        acceptingOrders: true,
        defaultPreparationTime: 10,
        currency: "INR",
        cancellationWindowSeconds: 60,
      });
    }

    // -------------------------------------------------------------
    // TEST 2: Atlas Replica Set & Transaction Capability Detection
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Atlas Replica Set & Transaction Detection ---");
    const hasTransactions = await checkTransactionSupport();
    if (!hasTransactions) {
      throw new Error("MongoDB Atlas deployment must support multi-document replica-set transactions");
    }
    logPass(2.1, `Atlas transaction support detected: ${hasTransactions} (Replica Set verified)`);

    // Verify raw session transaction lifecycle
    const rawSession = await mongoose.startSession();
    try {
      let inTx = false;
      await rawSession.withTransaction(async () => {
        inTx = rawSession.inTransaction();
      });
      if (!inTx) throw new Error("rawSession was not in transaction");
      logPass(2.2, "Mongoose raw multi-document session withTransaction() executed successfully");
    } finally {
      await rawSession.endSession();
    }

    // Setup base test user and category
    const testTag = Date.now();
    const testUser = await User.create({
      name: "Atlas Test User",
      email: `atlas_test_${testTag}@college.edu`,
      password: "TestPassword@123",
      role: "STUDENT",
    });
    cleanup.users.push(testUser._id);

    const testAdmin = await User.create({
      name: "Atlas Test Admin",
      email: `atlas_admin_${testTag}@college.edu`,
      password: "TestPassword@123",
      role: "ADMIN",
    });
    cleanup.users.push(testAdmin._id);

    const testCategory = await Category.create({
      name: `Test Cat ${testTag}`,
      slug: `test-cat-${testTag}`,
      displayOrder: 999,
    });
    cleanup.categories.push(testCategory._id);

    // -------------------------------------------------------------
    // TEST 3: Multi-Document Transaction Rollback on Failure
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Multi-Document Transaction Rollback on Forced Failure ---");
    const prodRollback = await Product.create({
      name: `Rollback Product ${testTag}`,
      slug: `rollback-prod-${testTag}`,
      price: 50,
      stock: 10,
      category: testCategory._id,
      isAvailable: true,
    });
    cleanup.products.push(prodRollback._id);

    // Run order creation with intentional failure during session
    let rollbackSessionThrew = false;
    const testSession = await mongoose.startSession();
    try {
      await testSession.withTransaction(async () => {
        // Decrement stock inside transaction
        await Product.findByIdAndUpdate(
          prodRollback._id,
          { $inc: { stock: -5 } },
          { session: testSession }
        );
        // Force an error midway
        throw new Error("Simulated transient network failure midway through order transaction");
      });
    } catch (err) {
      rollbackSessionThrew = true;
    } finally {
      await testSession.endSession();
    }

    if (!rollbackSessionThrew) {
      throw new Error("Session transaction failed to throw simulation error");
    }

    // Verify stock remains exactly 10
    const prodAfterRollback = await Product.findById(prodRollback._id);
    if (prodAfterRollback.stock !== 10) {
      throw new Error(`Expected stock to remain 10 after rollback, got ${prodAfterRollback.stock}`);
    }
    logPass(3, `Transaction aborted cleanly: stock rolled back to 10 (was decremented inside transaction)`);

    // -------------------------------------------------------------
    // TEST 4: Concurrency & Zero Overselling Protection
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Concurrency & Zero Overselling Protection ---");
    const prodConcurrency = await Product.create({
      name: `Concurrency Product ${testTag}`,
      slug: `concurrency-prod-${testTag}`,
      price: 40,
      stock: 2, // Only 2 units available
      category: testCategory._id,
      isAvailable: true,
    });
    cleanup.products.push(prodConcurrency._id);

    // Fire 5 concurrent order creation requests for 1 unit each
    const orderPromises = [];
    for (let i = 0; i < 5; i++) {
      orderPromises.push(
        createOrder({
          userId: testUser._id,
          items: [{ itemType: "PRODUCT", id: prodConcurrency._id, quantity: 1 }],
          paymentMethod: "CASH",
          notes: `Concurrency test order ${i}`,
        })
      );
    }

    const orderResults = await Promise.allSettled(orderPromises);
    const successfulOrders = orderResults.filter((r) => r.status === "fulfilled");
    const failedOrders = orderResults.filter((r) => r.status === "rejected");
    console.log("Failed orders count:", failedOrders.length);
    console.log("Failed order reasons:", failedOrders.map((f) => f.reason?.message || f.reason));
    console.log("Successful orders count:", successfulOrders.length);

    for (const res of successfulOrders) {
      cleanup.orders.push(res.value._id);
      for (const item of res.value.items) {
        cleanup.orderItems.push(item._id || item);
      }
    }

    const finalConcProd = await Product.findById(prodConcurrency._id);
    if (successfulOrders.length !== 2) {
      throw new Error(`Expected exactly 2 orders to succeed, but ${successfulOrders.length} succeeded`);
    }
    if (failedOrders.length !== 3) {
      throw new Error(`Expected exactly 3 orders to be rejected for insufficient stock, got ${failedOrders.length}`);
    }
    if (finalConcProd.stock !== 0) {
      throw new Error(`Expected final product stock to be 0, got ${finalConcProd.stock}`);
    }
    logPass(4, `Concurrency protection verified: Exactly 2 of 5 orders succeeded, 3 failed, final stock strictly 0 (no overselling)`);

    // -------------------------------------------------------------
    // TEST 5: Idempotency Under Concurrent Duplicate Requests
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Idempotency Under Concurrent Duplicate Requests ---");
    const prodIdemp = await Product.create({
      name: `Idempotency Product ${testTag}`,
      slug: `idemp-prod-${testTag}`,
      price: 35,
      stock: 10,
      category: testCategory._id,
      isAvailable: true,
    });
    cleanup.products.push(prodIdemp._id);

    const idempotencyKey = `IDEMP_KEY_${testTag}`;
    const duplicatePromises = [];
    for (let i = 0; i < 3; i++) {
      duplicatePromises.push(
        createOrder({
          userId: testUser._id,
          items: [{ itemType: "PRODUCT", id: prodIdemp._id, quantity: 1 }],
          paymentMethod: "CASH",
          idempotencyKey,
        })
      );
    }

    const dupResults = await Promise.allSettled(duplicatePromises);
    const successfulDups = dupResults.filter((r) => r.status === "fulfilled").map((r) => r.value);

    if (successfulDups.length < 1) {
      throw new Error("All duplicate requests failed unexpectedly");
    }

    const firstOrderNumber = successfulDups[0].orderNumber;
    for (const ord of successfulDups) {
      if (ord.orderNumber !== firstOrderNumber) {
        throw new Error(`Duplicate request created different orderNumber: ${ord.orderNumber} vs ${firstOrderNumber}`);
      }
      cleanup.orders.push(ord._id);
      for (const item of ord.items) {
        cleanup.orderItems.push(item._id || item);
      }
    }

    // Verify stock was decremented ONLY ONCE (from 10 to 9)
    const finalIdempProd = await Product.findById(prodIdemp._id);
    if (finalIdempProd.stock !== 9) {
      throw new Error(`Expected stock to be 9 after idempotent duplicate calls, got ${finalIdempProd.stock}`);
    }
    logPass(5, `Idempotency verified: 3 simultaneous requests resolved to same order (${firstOrderNumber}), stock decremented once (10 -> 9)`);

    // -------------------------------------------------------------
    // TEST 6: Combo Inventory Deduction & Restoration Accuracy
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Combo Component Restoration Accuracy ---");
    const prodBurger = await Product.create({
      name: `Combo Burger ${testTag}`,
      slug: `combo-burger-${testTag}`,
      price: 80,
      stock: 10,
      category: testCategory._id,
      isAvailable: true,
    });
    cleanup.products.push(prodBurger._id);

    const prodFries = await Product.create({
      name: `Combo Fries ${testTag}`,
      slug: `combo-fries-${testTag}`,
      price: 50,
      stock: 10,
      category: testCategory._id,
      isAvailable: true,
    });
    cleanup.products.push(prodFries._id);

    const comboMeal = await Combo.create({
      name: `Super Meal ${testTag}`,
      slug: `super-meal-${testTag}`,
      price: 110,
      isAvailable: true,
      items: [
        { product: prodBurger._id, quantity: 2 }, // 2 Burgers per combo
        { product: prodFries._id, quantity: 1 },  // 1 Fries per combo
      ],
    });
    cleanup.combos.push(comboMeal._id);

    // Create order with 2 units of Combo (Requires 4 Burgers, 2 Fries)
    const comboOrder = await createOrder({
      userId: testUser._id,
      items: [{ itemType: "COMBO", id: comboMeal._id, quantity: 2 }],
      paymentMethod: "CASH",
    });
    cleanup.orders.push(comboOrder._id);
    for (const item of comboOrder.items) {
      cleanup.orderItems.push(item._id || item);
    }

    // Check decremented stock
    const burgerAfterOrder = await Product.findById(prodBurger._id);
    const friesAfterOrder = await Product.findById(prodFries._id);
    if (burgerAfterOrder.stock !== 6 || friesAfterOrder.stock !== 8) {
      throw new Error(`Expected burger: 6, fries: 8. Got burger: ${burgerAfterOrder.stock}, fries: ${friesAfterOrder.stock}`);
    }
    logPass(6.1, `Combo order decremented component stocks accurately: Burger (10 -> 6), Fries (10 -> 8)`);

    // Cancel order as student
    const cancelledComboOrder = await cancelOrder({
      orderId: comboOrder._id,
      userId: testUser._id,
      reason: "Changed meal preference",
    });

    if (cancelledComboOrder.orderStatus !== "CANCELLED") {
      throw new Error(`Expected orderStatus to be CANCELLED, got ${cancelledComboOrder.orderStatus}`);
    }

    // Check restored stock
    const burgerAfterCancel = await Product.findById(prodBurger._id);
    const friesAfterCancel = await Product.findById(prodFries._id);
    if (burgerAfterCancel.stock !== 10 || friesAfterCancel.stock !== 10) {
      throw new Error(`Expected burger: 10, fries: 10. Got burger: ${burgerAfterCancel.stock}, fries: ${friesAfterCancel.stock}`);
    }
    logPass(6.2, `Combo cancellation restored component stocks accurately: Burger (6 -> 10), Fries (8 -> 10)`);

    // -------------------------------------------------------------
    // TEST 7: Prevention of Double Cancellation & Double Stock Restoration
    // -------------------------------------------------------------
    console.log("\n--- TEST 7: Double Cancellation Immunity ---");
    let doubleCancelStudentBlocked = false;
    try {
      await cancelOrder({
        orderId: comboOrder._id,
        userId: testUser._id,
        reason: "Duplicate student cancellation attempt",
      });
    } catch (err) {
      doubleCancelStudentBlocked = true;
    }
    if (!doubleCancelStudentBlocked) {
      throw new Error("Student was able to cancel an already cancelled order!");
    }

    let doubleCancelAdminBlocked = false;
    try {
      await adminCancelOrder({
        orderId: comboOrder._id,
        adminId: testAdmin._id,
        reason: "Duplicate admin cancellation attempt",
      });
    } catch (err) {
      doubleCancelAdminBlocked = true;
    }
    if (!doubleCancelAdminBlocked) {
      throw new Error("Admin was able to cancel an already cancelled order!");
    }

    // Verify stock was NOT restored again
    const burgerAfterDoubleCancel = await Product.findById(prodBurger._id);
    if (burgerAfterDoubleCancel.stock !== 10) {
      throw new Error(`Stock restored twice! Expected 10, got ${burgerAfterDoubleCancel.stock}`);
    }
    logPass(7, `Double cancellation rejected: neither student nor admin can restore stock twice (stock remains 10)`);

    // -------------------------------------------------------------
    // TEST 8: ACID Rollback on Cancellation Failure
    // -------------------------------------------------------------
    console.log("\n--- TEST 8: ACID Rollback on Forced Cancellation Failure ---");
    const prodRollbackCancel = await Product.create({
      name: `Rollback Cancel Prod ${testTag}`,
      slug: `rollback-cancel-${testTag}`,
      price: 60,
      stock: 5,
      category: testCategory._id,
      isAvailable: true,
    });
    cleanup.products.push(prodRollbackCancel._id);

    const orderToFailCancel = await createOrder({
      userId: testUser._id,
      items: [{ itemType: "PRODUCT", id: prodRollbackCancel._id, quantity: 2 }],
      paymentMethod: "CASH",
    });
    cleanup.orders.push(orderToFailCancel._id);
    for (const item of orderToFailCancel.items) {
      cleanup.orderItems.push(item._id || item);
    }

    // Stock after creation should be 3
    const stockBeforeFailedCancel = (await Product.findById(prodRollbackCancel._id)).stock;
    if (stockBeforeFailedCancel !== 3) {
      throw new Error(`Expected stock 3, got ${stockBeforeFailedCancel}`);
    }

    let forcedFailureThrew = false;
    try {
      await cancelOrder({
        orderId: orderToFailCancel._id,
        userId: testUser._id,
        reason: "Test rollback",
        _forceInventoryFailure: true,
      });
    } catch (err) {
      forcedFailureThrew = true;
    }

    if (!forcedFailureThrew) {
      throw new Error("Expected _forceInventoryFailure to throw error");
    }

    // Verify order is NOT cancelled, and stock is NOT restored
    const orderAfterForcedFailure = await Order.findById(orderToFailCancel._id);
    const prodAfterForcedFailure = await Product.findById(prodRollbackCancel._id);

    if (orderAfterForcedFailure.orderStatus === "CANCELLED") {
      throw new Error("Order was cancelled despite transaction failure!");
    }
    if (prodAfterForcedFailure.stock !== 3) {
      throw new Error(`Stock corrupted! Expected 3, got ${prodAfterForcedFailure.stock}`);
    }
    logPass(8, `Transaction rollback on cancellation failure verified: Order remains ${orderAfterForcedFailure.orderStatus}, stock remains 3`);

    // -------------------------------------------------------------
    // TEST 9: Abandoned Online Order Timeout & Stock Release
    // -------------------------------------------------------------
    console.log("\n--- TEST 9: Abandoned Online Order Timeout & Stock Release ---");
    const prodAbandoned = await Product.create({
      name: `Abandoned Prod ${testTag}`,
      slug: `abandoned-prod-${testTag}`,
      price: 90,
      stock: 5,
      category: testCategory._id,
      isAvailable: true,
    });
    cleanup.products.push(prodAbandoned._id);

    const abandonedOrder = await createOrder({
      userId: testUser._id,
      items: [{ itemType: "PRODUCT", id: prodAbandoned._id, quantity: 2 }],
      paymentMethod: "ONLINE",
    });
    cleanup.orders.push(abandonedOrder._id);
    for (const item of abandonedOrder.items) {
      cleanup.orderItems.push(item._id || item);
    }

    // Stock should be decremented to 3
    if ((await Product.findById(prodAbandoned._id)).stock !== 3) {
      throw new Error("Stock was not decremented on online order creation");
    }

    // Simulate order being abandoned 20 minutes ago (bypass Mongoose timestamps middleware)
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    await Order.collection.updateOne(
      { _id: abandonedOrder._id },
      { $set: { createdAt: twentyMinsAgo } }
    );

    // Run cleanup scanner
    const releasedOrders = await cleanupAbandonedOnlineOrders(15);
    const isReleased = releasedOrders.some((o) => o._id.toString() === abandonedOrder._id.toString());

    if (!isReleased) {
      throw new Error("Abandoned online order was not caught and released by cleanup scanner");
    }

    // Verify order status and stock restoration
    const finalAbandonedOrder = await Order.findById(abandonedOrder._id);
    const finalAbandonedProd = await Product.findById(prodAbandoned._id);

    if (finalAbandonedOrder.orderStatus !== "CANCELLED" || finalAbandonedOrder.paymentStatus !== "FAILED") {
      throw new Error(`Expected CANCELLED / FAILED, got ${finalAbandonedOrder.orderStatus} / ${finalAbandonedOrder.paymentStatus}`);
    }
    if (finalAbandonedProd.stock !== 5) {
      throw new Error(`Expected stock restored to 5, got ${finalAbandonedProd.stock}`);
    }
    logPass(9, `Abandoned order timeout verified: Order cancelled by SYSTEM, stock released (3 -> 5)`);

    // -------------------------------------------------------------
    // TEST 10: Verified Payment Refund Invariance
    // -------------------------------------------------------------
    console.log("\n--- TEST 10: Verified Payment Refund Invariance ---");
    // Case A: Unpaid order cancellation sets payment to FAILED without claiming refund
    const unpaidOrder = await createOrder({
      userId: testUser._id,
      items: [{ itemType: "PRODUCT", id: prodRollbackCancel._id, quantity: 1 }],
      paymentMethod: "ONLINE",
    });
    cleanup.orders.push(unpaidOrder._id);
    for (const item of unpaidOrder.items) {
      cleanup.orderItems.push(item._id || item);
    }

    const cancelledUnpaid = await cancelOrder({
      orderId: unpaidOrder._id,
      userId: testUser._id,
      reason: "No longer needed",
    });

    const unpaidPayment = await Payment.findOne({ order: unpaidOrder._id });
    if (cancelledUnpaid.paymentStatus !== "FAILED" || (unpaidPayment && unpaidPayment.status !== "FAILED")) {
      throw new Error("Unpaid cancelled order incorrectly marked as REFUNDED");
    }
    logPass(10.1, "Unpaid order cancellation correctly sets paymentStatus = FAILED (zero false refund claims)");

    // Case B: Paid order with verified refund pipeline
    const paidOrder = await createOrder({
      userId: testUser._id,
      items: [{ itemType: "PRODUCT", id: prodRollbackCancel._id, quantity: 1 }],
      paymentMethod: "ONLINE",
    });
    cleanup.orders.push(paidOrder._id);
    for (const item of paidOrder.items) {
      cleanup.orderItems.push(item._id || item);
    }

    // Mark as PAID with a real payment record
    await Order.findByIdAndUpdate(paidOrder._id, { $set: { paymentStatus: "PAID", orderStatus: "CONFIRMED" } });
    const paymentDoc = await Payment.findOneAndUpdate(
      { order: paidOrder._id },
      {
        $set: {
          status: "PAID",
          providerPaymentId: "pay_test_verified_" + testTag,
        },
      },
      { new: true }
    );
    if (paymentDoc) cleanup.payments.push(paymentDoc._id);

    const cancelledPaid = await cancelOrder({
      orderId: paidOrder._id,
      userId: testUser._id,
      reason: "Student requested cancellation of paid order",
    });

    const finalPaidPayment = await Payment.findOne({ order: paidOrder._id });
    if (cancelledPaid.paymentStatus !== "REFUNDED" || finalPaidPayment.status !== "REFUNDED") {
      throw new Error(`Expected REFUNDED, got order: ${cancelledPaid.paymentStatus}, payment: ${finalPaidPayment.status}`);
    }
    const refundId = finalPaidPayment.refundId || finalPaidPayment.metadata?.refundId;
    if (!refundId) {
      throw new Error("Refund executed without valid refundId tracking");
    }
    logPass(10.2, `Paid order cancellation executed verified refund via processOrderRefund (refundId: ${refundId})`);

    // -------------------------------------------------------------
    // TEST 11: Production Indexes Audit
    // -------------------------------------------------------------
    console.log("\n--- TEST 11: Production Indexes Audit ---");
    await Promise.all([Order.init(), Product.init(), User.init()]);
    const orderIndexes = await Order.collection.getIndexes();
    const productIndexes = await Product.collection.getIndexes();
    const userIndexes = await User.collection.getIndexes();

    const orderIndexKeys = Object.keys(orderIndexes);
    const userIndexKeys = Object.keys(userIndexes);
    const productIndexKeys = Object.keys(productIndexes);

    // Verify User email unique
    const hasUserEmailIndex = userIndexKeys.some((k) => k.includes("email"));
    if (!hasUserEmailIndex) throw new Error("User email unique index missing");

    // Verify Order orderNumber unique
    const hasOrderNumIndex = orderIndexKeys.some((k) => k.includes("orderNumber"));
    if (!hasOrderNumIndex) throw new Error("Order orderNumber index missing");

    // Verify Order user + idempotencyKey compound unique partial index
    const hasIdempCompound = orderIndexKeys.some(
      (k) => k.includes("user_1_idempotencyKey_1") || (orderIndexes[k] && orderIndexes[k].key && orderIndexes[k].key.idempotencyKey)
    );
    if (!hasIdempCompound) throw new Error("Order idempotency compound index missing");

    // Verify abandoned order scanner compound index
    const hasAbandonedIndex = orderIndexKeys.some((k) => k.includes("paymentMethod_1_orderStatus_1"));
    if (!hasAbandonedIndex) throw new Error("Abandoned online order scanner index missing");

    logPass(11, `All production indexes verified: user email, orderNumber, idempotency compound, and abandoned scanner`);

    console.log("\n==================================================================");
    console.log("   ALL ATLAS INTEGRITY & CONCURRENCY TESTS PASSED SUCCESSFULLY!   ");
    console.log("==================================================================\n");

  } catch (err) {
    logFail("FATAL", "Test suite encountered an error", err);
  } finally {
    console.log("Cleaning up isolated test documents...");
    try {
      if (cleanup.users.length) await User.deleteMany({ _id: { $in: cleanup.users } });
      if (cleanup.categories.length) await Category.deleteMany({ _id: { $in: cleanup.categories } });
      if (cleanup.products.length) await Product.deleteMany({ _id: { $in: cleanup.products } });
      if (cleanup.combos.length) await Combo.deleteMany({ _id: { $in: cleanup.combos } });
      if (cleanup.orders.length) await Order.deleteMany({ _id: { $in: cleanup.orders } });
      if (cleanup.orderItems.length) await OrderItem.deleteMany({ _id: { $in: cleanup.orderItems } });
      if (cleanup.payments.length) await Payment.deleteMany({ _id: { $in: cleanup.payments } });

      if (originalSettings) {
        await StoreSettings.updateOne({}, { $set: originalSettings });
      }
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr.message);
    }

    await mongoose.disconnect();
    console.log("MongoDB connection closed cleanly.\n");
  }
};

runAtlasIntegrityTests();
