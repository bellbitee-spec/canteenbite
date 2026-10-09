require("dotenv").config();
const { io } = require("socket.io-client");

const BASE_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

const logPass = (title) => console.log(`\x1b[32m✔ PASS:\x1b[0m ${title}`);
const logFail = (title, err) => {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${title}`);
  if (err) console.error(err);
  process.exitCode = 1;
};

const waitForEvent = (socket, eventName, filterFn = null, timeoutMs = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, listener);
      reject(new Error(`Timed out waiting for event '${eventName}' after ${timeoutMs}ms`));
    }, timeoutMs);

    const listener = (data) => {
      if (typeof filterFn === "function" && !filterFn(data)) {
        return; // Ignore events that do not match the expected filter
      }
      clearTimeout(timer);
      socket.off(eventName, listener);
      resolve(data);
    };

    socket.on(eventName, listener);
  });
};

const runTests = async () => {
  console.log("\n========================================================");
  console.log("   STARTING PART 22 ADMIN KITCHEN ORDER BOARD TESTS");
  console.log("========================================================\n");

  let adminToken = null;
  let studentToken = null;
  let testProduct = null;
  let adminSocket1 = null;
  let adminSocket2 = null;

  try {
    // ----------------------------------------------------
    // Step 1: Authentication & Setup
    // ----------------------------------------------------
    console.log("--- 1. Authenticating Roles ---");
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@college.edu", password: "Admin@12345" }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data?.token || adminData.token;
    if (!adminToken) throw new Error("Admin login failed");
    logPass("Admin logged in successfully");

    const sRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student_test@college.edu", password: "Student@12345" }),
    });
    const sData = await sRes.json();
    studentToken = sData.data?.token || sData.token;
    if (!studentToken) throw new Error("Student login failed");
    logPass("Student logged in successfully");

    // Ensure store is open & accepting orders
    await fetch(`${BASE_URL}/admin/store/manual-override`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        isManuallyClosed: false,
        isAcceptingOrders: true,
        reason: null,
      }),
    });

    // Find available in-stock product
    const prodRes = await fetch(`${BASE_URL}/products?limit=20`);
    const prodData = await prodRes.json();
    const products = prodData.data?.products || prodData.products || [];
    testProduct = products.find((p) => p.isAvailable && p.stock >= 10);
    if (!testProduct) throw new Error("No in-stock product found");
    logPass(`Using test product: ${testProduct.name} (Stock: ${testProduct.stock})`);

    const createOrder = async (method = "CASH", notes = "") => {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          items: [{ itemType: "PRODUCT", id: testProduct._id || testProduct.id, quantity: 1 }],
          paymentMethod: method,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Create order failed: ${JSON.stringify(data)}`);
      return data.data?.order || data.order || data.data;
    };

    // ----------------------------------------------------
    // Step 2: Connect Admin Sockets & Join admin:orders Room
    // ----------------------------------------------------
    console.log("\n--- 2. Connecting Admin Sockets to admin:orders Room ---");
    adminSocket1 = io(SOCKET_URL, {
      auth: { token: adminToken },
      transports: ["websocket", "polling"],
      reconnection: false,
    });
    await new Promise((resolve, reject) => {
      adminSocket1.on("connect", resolve);
      adminSocket1.on("connect_error", reject);
    });
    // Subscribe to admin orders
    const joinRes1 = await new Promise((resolve) => {
      adminSocket1.emit("admin:join", {}, resolve);
    });
    if (!joinRes1 || !joinRes1.success) throw new Error("adminSocket1 failed to join admin:orders");
    logPass("Admin Socket 1 connected & joined room: admin:orders");

    adminSocket2 = io(SOCKET_URL, {
      auth: { token: adminToken },
      transports: ["websocket", "polling"],
      reconnection: false,
    });
    await new Promise((resolve, reject) => {
      adminSocket2.on("connect", resolve);
      adminSocket2.on("connect_error", reject);
    });
    const joinRes2 = await new Promise((resolve) => {
      adminSocket2.emit("admin:join", {}, resolve);
    });
    if (!joinRes2 || !joinRes2.success) throw new Error("adminSocket2 failed to join admin:orders");
    logPass("Admin Socket 2 connected & joined room: admin:orders");

    // ----------------------------------------------------
    // Step 3: Test 1 — New Order Appears in Realtime
    // ----------------------------------------------------
    console.log("\n--- 3. Testing Test 1: New Order Appears in Realtime ---");
    let newOrderEventPromise = waitForEvent(
      adminSocket1,
      "order:updated",
      (data) => data.orderStatus === "PENDING"
    );

    const order1 = await createOrder("CASH", "Extra crispy please");
    const order1Id = (order1._id || order1.id).toString();

    const receivedNewOrder = await newOrderEventPromise;
    if (receivedNewOrder.orderId !== order1Id || receivedNewOrder.orderStatus !== "PENDING") {
      throw new Error(`Unexpected event: ${JSON.stringify(receivedNewOrder)}`);
    }
    logPass(`Admin Kitchen Board received new order #${receivedNewOrder.orderNumber} (PENDING) in realtime!`);

    // ----------------------------------------------------
    // Step 4: Test 2 — Admin Confirms Order (PENDING -> CONFIRMED)
    // ----------------------------------------------------
    console.log("\n--- 4. Testing Test 2: Admin Confirms Order ---");
    let confirmEventPromise = waitForEvent(
      adminSocket1,
      "order:updated",
      (data) => data.orderId === order1Id && data.orderStatus === "CONFIRMED"
    );

    const confRes = await fetch(`${BASE_URL}/admin/orders/${order1Id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "CONFIRMED" }),
    });
    if (!confRes.ok) throw new Error("Confirm order failed");

    const confEvent = await confirmEventPromise;
    logPass(`Order transitioned to CONFIRMED (received via socket by admin)`);

    // ----------------------------------------------------
    // Step 5: Test 3 — Preparing (CONFIRMED -> PREPARING)
    // ----------------------------------------------------
    console.log("\n--- 5. Testing Test 3: Preparing Order ---");
    let prepEventPromise = waitForEvent(
      adminSocket1,
      "order:updated",
      (data) => data.orderId === order1Id && data.orderStatus === "PREPARING"
    );

    const prepRes = await fetch(`${BASE_URL}/admin/orders/${order1Id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "PREPARING" }),
    });
    if (!prepRes.ok) throw new Error("Prep order failed");

    const prepEvent = await prepEventPromise;
    if (!prepEvent.preparationStartedAt) throw new Error("preparationStartedAt missing on PREPARING");
    logPass(`Order transitioned to PREPARING with preparationStartedAt set`);

    // ----------------------------------------------------
    // Step 6: Test 5 — Delayed (PREPARING -> DELAYED)
    // ----------------------------------------------------
    console.log("\n--- 6. Testing Test 5: Delayed Workflow ---");
    let delayedEventPromise = waitForEvent(
      adminSocket1,
      "order:updated",
      (data) => data.orderId === order1Id && data.orderStatus === "DELAYED"
    );

    const delayRes = await fetch(`${BASE_URL}/admin/orders/${order1Id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "DELAYED" }),
    });
    if (!delayRes.ok) throw new Error("Mark delayed failed");

    const delayEvent = await delayedEventPromise;
    if (!delayEvent.delayedAt) throw new Error("delayedAt missing on DELAYED status");
    logPass(`Order transitioned to DELAYED with delayedAt timestamp`);

    // ----------------------------------------------------
    // Step 7: Test 4 — Ready (DELAYED -> READY)
    // ----------------------------------------------------
    console.log("\n--- 7. Testing Test 4: Mark Ready for Pickup ---");
    let readyEventPromise = waitForEvent(
      adminSocket1,
      "order:updated",
      (data) => data.orderId === order1Id && data.orderStatus === "READY"
    );

    const readyRes = await fetch(`${BASE_URL}/admin/orders/${order1Id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "READY" }),
    });
    if (!readyRes.ok) throw new Error("Mark ready failed");

    const readyEvent = await readyEventPromise;
    if (!readyEvent.readyAt) throw new Error("readyAt missing on READY status");
    logPass(`Order transitioned to READY with readyAt timestamp`);

    // ----------------------------------------------------
    // Step 8: Test 6 — Completed (READY -> COMPLETED)
    // ----------------------------------------------------
    console.log("\n--- 8. Testing Test 6: Complete & Hand Over ---");
    let completeEventPromise = waitForEvent(
      adminSocket1,
      "order:updated",
      (data) => data.orderId === order1Id && data.orderStatus === "COMPLETED"
    );

    const completeRes = await fetch(`${BASE_URL}/admin/orders/${order1Id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    if (!completeRes.ok) throw new Error("Complete order failed");

    const completeEvent = await completeEventPromise;
    if (!completeEvent.completedAt) throw new Error("completedAt missing on COMPLETED status");
    logPass(`Order transitioned to COMPLETED with completedAt timestamp`);

    // ----------------------------------------------------
    // Step 9: Test 7 — Admin Cancellation with Required Reason
    // ----------------------------------------------------
    console.log("\n--- 9. Testing Test 7: Admin Cancellation ---");
    const order2 = await createOrder("CASH");
    const order2Id = (order2._id || order2.id).toString();

    let adminCancelPromise = waitForEvent(
      adminSocket1,
      "order:updated",
      (data) => data.orderId === order2Id && data.orderStatus === "CANCELLED"
    );

    const adminCancelRes = await fetch(`${BASE_URL}/admin/orders/${order2Id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: "Kitchen out of ingredients" }),
    });
    if (!adminCancelRes.ok) throw new Error("Admin cancel failed");

    const adminCancelEvent = await adminCancelPromise;
    if (adminCancelEvent.cancelledBy !== "ADMIN" || adminCancelEvent.cancellationReason !== "Kitchen out of ingredients") {
      throw new Error(`Unexpected admin cancel event: ${JSON.stringify(adminCancelEvent)}`);
    }
    logPass("Admin cancellation emitted order:updated with cancelledBy: ADMIN and custom reason");

    // ----------------------------------------------------
    // Step 10: Test 8 — Student Cancellation Realtime Reflection
    // ----------------------------------------------------
    console.log("\n--- 10. Testing Test 8: Student Cancellation Reflection ---");
    const order3 = await createOrder("CASH");
    const order3Id = (order3._id || order3.id).toString();

    let studentCancelPromise = waitForEvent(
      adminSocket1,
      "order:updated",
      (data) => data.orderId === order3Id && data.orderStatus === "CANCELLED"
    );

    const studentCancelRes = await fetch(`${BASE_URL}/orders/${order3Id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ reason: "Changed my mind" }),
    });
    if (!studentCancelRes.ok) throw new Error("Student cancel failed");

    const studentCancelEvent = await studentCancelPromise;
    if (studentCancelEvent.cancelledBy !== "STUDENT") {
      throw new Error(`Expected cancelledBy STUDENT, got ${studentCancelEvent.cancelledBy}`);
    }
    logPass("Student cancellation reflected on Admin Socket with cancelledBy: STUDENT");

    // ----------------------------------------------------
    // Step 11: Test 9 — Concurrency: Two Admins Operating on Same Order
    // ----------------------------------------------------
    console.log("\n--- 11. Testing Test 9: Concurrency Handling ---");
    const order4 = await createOrder("CASH");
    const order4Id = (order4._id || order4.id).toString();

    // Admin 1 successfully moves order to CONFIRMED then PREPARING
    const a1Res1 = await fetch(`${BASE_URL}/admin/orders/${order4Id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "CONFIRMED" }),
    });
    if (!a1Res1.ok) throw new Error("Admin 1 confirmation failed");

    const a1Res2 = await fetch(`${BASE_URL}/admin/orders/${order4Id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "PREPARING" }),
    });
    if (!a1Res2.ok) throw new Error("Admin 1 preparing transition failed");
    logPass("Admin 1 advanced order #4 to PREPARING");

    // Admin 2 attempts stale transition based on old PENDING state (trying to CONFIRM)
    // Backend rejects because order is already in PREPARING (transition PREPARING -> CONFIRMED is invalid)
    const a2Res = await fetch(`${BASE_URL}/admin/orders/${order4Id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "CONFIRMED" }),
    });
    const a2Data = await a2Res.json();
    if (a2Res.status === 400 || a2Res.status === 409) {
      logPass(`Concurrent stale transition rejected by backend (${a2Res.status}): "${a2Data.message}"`);
    } else {
      throw new Error(`Expected 400/409 for concurrent update, got ${a2Res.status}`);
    }

    // Admin 2 fetches authoritative order and sees true current status
    const freshRes = await fetch(`${BASE_URL}/admin/orders/${order4Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const freshData = await freshRes.json();
    const freshOrder = freshData.data?.order || freshData.order;
    if (freshOrder.orderStatus === "PREPARING") {
      logPass(`Authoritative order retrieval correctly reflects current status: PREPARING`);
    } else {
      throw new Error(`Expected PREPARING, got ${freshOrder.orderStatus}`);
    }

    // ----------------------------------------------------
    // Step 12: Test 10 & 11 — Socket Disconnect and Reconnect
    // ----------------------------------------------------
    console.log("\n--- 12. Testing Test 10 & 11: Disconnect & Reconnect ---");
    adminSocket1.disconnect();
    if (adminSocket1.connected) throw new Error("Socket did not disconnect");
    logPass("Admin socket disconnected cleanly");

    adminSocket1.connect();
    await new Promise((resolve) => adminSocket1.once("connect", resolve));
    logPass("Admin socket reconnected successfully");

    // Rejoin admin room after reconnect
    const rejoinRes = await new Promise((resolve) => {
      adminSocket1.emit("admin:join", {}, resolve);
    });
    if (!rejoinRes?.success) throw new Error("Rejoining admin room failed");
    logPass("Admin socket rejoined admin:orders room upon reconnection");

    // ----------------------------------------------------
    // Step 13: Test 12 — Existing Filters
    // ----------------------------------------------------
    console.log("\n--- 13. Testing Test 12: Filters Support ---");
    // Status filter
    const filterStatusRes = await fetch(`${BASE_URL}/admin/orders?status=CONFIRMED`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const filterStatusData = await filterStatusRes.json();
    const confirmedOrders = filterStatusData.orders || filterStatusData.data?.orders || [];
    const allAreConfirmed = confirmedOrders.every((o) => o.orderStatus === "CONFIRMED");
    if (allAreConfirmed && confirmedOrders.length > 0) {
      logPass(`status=CONFIRMED filter verified (${confirmedOrders.length} orders returned)`);
    } else {
      throw new Error("status=CONFIRMED filter returned non-confirmed orders");
    }

    // Payment method filter
    const filterPayRes = await fetch(`${BASE_URL}/admin/orders?paymentMethod=CASH`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const filterPayData = await filterPayRes.json();
    const cashOrders = filterPayData.orders || filterPayData.data?.orders || [];
    const allAreCash = cashOrders.every((o) => o.paymentMethod === "CASH");
    if (allAreCash && cashOrders.length > 0) {
      logPass(`paymentMethod=CASH filter verified (${cashOrders.length} orders returned)`);
    } else {
      throw new Error("paymentMethod=CASH filter returned non-cash orders");
    }

    // ----------------------------------------------------
    // Step 14: Test 13 — Existing Pagination
    // ----------------------------------------------------
    console.log("\n--- 14. Testing Test 13: Pagination Support ---");
    const pageRes = await fetch(`${BASE_URL}/admin/orders?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pageData = await pageRes.json();
    if (
      pageData.pagination &&
      pageData.pagination.page === 1 &&
      pageData.pagination.limit === 5 &&
      pageData.pagination.total > 0
    ) {
      logPass(`Pagination verified: Page 1 of ${pageData.pagination.totalPages} (${pageData.pagination.total} total orders)`);
    } else {
      throw new Error(`Pagination metadata missing or invalid: ${JSON.stringify(pageData.pagination)}`);
    }

    // ----------------------------------------------------
    // Step 15: Test 14 — Existing Order Details View
    // ----------------------------------------------------
    console.log("\n--- 15. Testing Test 14: Order Details API ---");
    const detailsRes = await fetch(`${BASE_URL}/admin/orders/${order1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const detailsData = await detailsRes.json();
    const detailOrder = detailsData.data?.order || detailsData.order;
    if (
      detailOrder &&
      detailOrder.orderNumber &&
      detailOrder.user?.email &&
      Array.isArray(detailOrder.items) &&
      detailOrder.items.length > 0
    ) {
      logPass(`Order details verified: #${detailOrder.orderNumber}, Items: ${detailOrder.items.length}, User: ${detailOrder.user.email}`);
    } else {
      throw new Error(`Order details incomplete: ${JSON.stringify(detailsData)}`);
    }

    // ----------------------------------------------------
    // Step 16: Dashboard Stats API Verification
    // ----------------------------------------------------
    console.log("\n--- 16. Testing Dashboard Stats API ---");
    const statsRes = await fetch(`${BASE_URL}/admin/orders/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await statsRes.json();
    const stats = statsData.data?.stats || statsData.stats;
    if (
      stats &&
      typeof stats.pending === "number" &&
      typeof stats.confirmed === "number" &&
      typeof stats.preparing === "number" &&
      typeof stats.ready === "number" &&
      typeof stats.delayed === "number" &&
      typeof stats.completed === "number" &&
      typeof stats.cancelled === "number"
    ) {
      logPass(`Stats API verified: pending=${stats.pending}, confirmed=${stats.confirmed}, prep=${stats.preparing}, ready=${stats.ready}, delayed=${stats.delayed}, completed=${stats.completed}, cancelled=${stats.cancelled}`);
    } else {
      throw new Error(`Stats API invalid: ${JSON.stringify(statsData)}`);
    }

    console.log("\n========================================================");
    console.log("   ALL PART 22 ADMIN KITCHEN ORDER BOARD TESTS PASSED!");
    console.log("========================================================\n");
  } catch (err) {
    logFail("Test suite encountered an error", err);
  } finally {
    if (adminSocket1) adminSocket1.disconnect();
    if (adminSocket2) adminSocket2.disconnect();
  }
};

runTests();
