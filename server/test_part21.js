require("dotenv").config();
const crypto = require("crypto");
const { io } = require("socket.io-client");

const BASE_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "canteen_razorpay_secret_key_98765";

const logPass = (title) => console.log(`\x1b[32m✔ PASS:\x1b[0m ${title}`);
const logFail = (title, err) => {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${title}`);
  if (err) console.error(err);
  process.exitCode = 1;
};

const waitForEvent = (socket, eventName, timeoutMs = 4000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, listener);
      reject(new Error(`Timed out waiting for event '${eventName}' after ${timeoutMs}ms`));
    }, timeoutMs);

    const listener = (data) => {
      clearTimeout(timer);
      socket.off(eventName, listener);
      resolve(data);
    };

    socket.on(eventName, listener);
  });
};

const runTests = async () => {
  console.log("\n========================================================");
  console.log("   STARTING PART 21 REALTIME SOCKET.IO ORDER TESTS");
  console.log("========================================================\n");

  let adminToken = null;
  let student1Token = null;
  let student2Token = null;
  let student1User = null;
  let student2User = null;
  let testProduct = null;

  let student1Socket = null;
  let student2Socket = null;
  let adminSocket = null;

  try {
    // ----------------------------------------------------
    // Step 1: Authenticate Roles
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

    const s1Res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student_test@college.edu", password: "Student@12345" }),
    });
    const s1Data = await s1Res.json();
    student1Token = s1Data.data?.token || s1Data.token;
    student1User = s1Data.data?.user || s1Data.user;
    if (!student1Token) throw new Error("Student 1 login failed");
    logPass(`Student 1 logged in (${student1User.email})`);

    const s2Res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student2_test@college.edu", password: "Student@12345" }),
    });
    let s2Data = await s2Res.json();
    if (!s2Res.ok) {
      const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Student Two",
          email: "student2_test@college.edu",
          password: "Student@12345",
          phone: "9876543212",
        }),
      });
      s2Data = await regRes.json();
    }
    student2Token = s2Data.data?.token || s2Data.token;
    student2User = s2Data.data?.user || s2Data.user;
    if (!student2Token) throw new Error("Student 2 login failed");
    logPass(`Student 2 logged in (${student2User.email})`);

    // Ensure store is open and accepting orders
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

    // Fetch an in-stock product
    const prodRes = await fetch(`${BASE_URL}/products?limit=20`);
    const prodData = await prodRes.json();
    const products = prodData.data?.products || prodData.products || [];
    testProduct = products.find((p) => p.isAvailable && p.stock >= 10);
    if (!testProduct) throw new Error("No in-stock product found for order creation");
    logPass(`Selected test product: ${testProduct.name} (Stock: ${testProduct.stock})`);

    // Helper to create order for student
    const createTestOrder = async (token, method = "CASH") => {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: [
            {
              itemType: "PRODUCT",
              id: testProduct._id || testProduct.id,
              quantity: 1,
            },
          ],
          paymentMethod: method,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Create order failed: ${JSON.stringify(data)}`);
      return data.data?.order || data.order || data.data;
    };

    // ----------------------------------------------------
    // Step 2: Test 8 — Unauthorized Socket Access
    // ----------------------------------------------------
    console.log("\n--- 2. Testing Unauthorized Socket Access ---");
    // A. Connect without token
    const noAuthPromise = new Promise((resolve, reject) => {
      const socket = io(SOCKET_URL, {
        reconnection: false,
        timeout: 2000,
      });
      socket.on("connect_error", (err) => {
        socket.disconnect();
        resolve(err.message);
      });
      socket.on("connect", () => {
        socket.disconnect();
        reject(new Error("Socket connected without token (expected rejection)"));
      });
    });
    const noAuthErr = await noAuthPromise;
    logPass(`Socket rejected connection without token: "${noAuthErr}"`);

    // B. Connect with invalid token
    const badAuthPromise = new Promise((resolve, reject) => {
      const socket = io(SOCKET_URL, {
        auth: { token: "bad.jwt.token" },
        reconnection: false,
        timeout: 2000,
      });
      socket.on("connect_error", (err) => {
        socket.disconnect();
        resolve(err.message);
      });
      socket.on("connect", () => {
        socket.disconnect();
        reject(new Error("Socket connected with invalid token (expected rejection)"));
      });
    });
    const badAuthErr = await badAuthPromise;
    logPass(`Socket rejected invalid token: "${badAuthErr}"`);

    // C. Connect authenticated sockets
    student1Socket = io(SOCKET_URL, {
      auth: { token: student1Token },
      transports: ["websocket", "polling"],
      reconnection: false,
    });
    await new Promise((resolve, reject) => {
      student1Socket.on("connect", resolve);
      student1Socket.on("connect_error", reject);
    });
    logPass("Student 1 socket connected successfully with JWT auth");

    student2Socket = io(SOCKET_URL, {
      auth: { token: student2Token },
      transports: ["websocket", "polling"],
      reconnection: false,
    });
    await new Promise((resolve, reject) => {
      student2Socket.on("connect", resolve);
      student2Socket.on("connect_error", reject);
    });
    logPass("Student 2 socket connected successfully with JWT auth");

    adminSocket = io(SOCKET_URL, {
      auth: { token: adminToken },
      transports: ["websocket", "polling"],
      reconnection: false,
    });
    await new Promise((resolve, reject) => {
      adminSocket.on("connect", resolve);
      adminSocket.on("connect_error", reject);
    });
    logPass("Admin socket connected successfully with JWT auth");

    // ----------------------------------------------------
    // Step 3: Test 9 — Attempt to Join Another Student's Order
    // ----------------------------------------------------
    console.log("\n--- 3. Testing Cross-Student Room Authorization ---");
    const orderA = await createTestOrder(student1Token, "CASH");
    const orderAId = (orderA._id || orderA.id).toString();
    logPass(`Created Order A (${orderAId}) for Student 1`);

    // Student 2 attempts to join Student 1's order room
    const unauthorizedJoinPromise = new Promise((resolve, reject) => {
      student2Socket.emit("order:join", { orderId: orderAId }, (response) => {
        if (response && response.success === false) {
          resolve(response.message);
        } else {
          reject(new Error("Student 2 was unexpectedly permitted to join Order A room"));
        }
      });
      // Also catch order:error event if emitted
      student2Socket.once("order:error", (errData) => {
        resolve(errData.message);
      });
    });

    const forbiddenMsg = await unauthorizedJoinPromise;
    logPass(`Forbidden room access blocked for Student 2: "${forbiddenMsg}"`);

    // ----------------------------------------------------
    // Step 4: Test 1 & 2 — Admin Changes Order Status & Student Sees Update
    // ----------------------------------------------------
    console.log("\n--- 4. Testing Admin Status Changes & Realtime Emission ---");
    // Student 1 joins Order A room
    const s1JoinPromise = new Promise((resolve, reject) => {
      student1Socket.emit("order:join", { orderId: orderAId }, (res) => {
        if (res && res.success) resolve(res);
        else reject(new Error("Student 1 failed to join own order room"));
      });
    });
    await s1JoinPromise;
    logPass(`Student 1 joined room order:${orderAId}`);

    // Admin updates status: PENDING -> CONFIRMED
    let updateEventPromise = waitForEvent(student1Socket, "order:updated");
    const confRes = await fetch(`${BASE_URL}/admin/orders/${orderAId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "CONFIRMED" }),
    });
    if (!confRes.ok) throw new Error("Admin status update to CONFIRMED failed");

    let receivedUpdate = await updateEventPromise;
    if (receivedUpdate.orderId !== orderAId || receivedUpdate.orderStatus !== "CONFIRMED") {
      throw new Error(`Unexpected event payload: ${JSON.stringify(receivedUpdate)}`);
    }
    logPass("Student 1 received order:updated (CONFIRMED) in realtime without refresh");

    // Admin updates status: CONFIRMED -> PREPARING
    updateEventPromise = waitForEvent(student1Socket, "order:updated");
    await fetch(`${BASE_URL}/admin/orders/${orderAId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "PREPARING" }),
    });
    receivedUpdate = await updateEventPromise;
    if (receivedUpdate.orderStatus !== "PREPARING") {
      throw new Error(`Expected PREPARING, got ${receivedUpdate.orderStatus}`);
    }
    logPass("Student 1 received order:updated (PREPARING) in realtime");

    // Admin updates status: PREPARING -> READY
    updateEventPromise = waitForEvent(student1Socket, "order:updated");
    await fetch(`${BASE_URL}/admin/orders/${orderAId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "READY" }),
    });
    receivedUpdate = await updateEventPromise;
    if (receivedUpdate.orderStatus !== "READY") {
      throw new Error(`Expected READY, got ${receivedUpdate.orderStatus}`);
    }
    logPass("Student 1 received order:updated (READY) in realtime");

    // Admin updates status: READY -> COMPLETED
    updateEventPromise = waitForEvent(student1Socket, "order:updated");
    await fetch(`${BASE_URL}/admin/orders/${orderAId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    receivedUpdate = await updateEventPromise;
    if (receivedUpdate.orderStatus !== "COMPLETED") {
      throw new Error(`Expected COMPLETED, got ${receivedUpdate.orderStatus}`);
    }
    logPass("Student 1 received order:updated (COMPLETED) in realtime");

    // ----------------------------------------------------
    // Step 5: Test 5 — Student Cancellation Emits Realtime Update
    // ----------------------------------------------------
    console.log("\n--- 5. Testing Student Cancellation Realtime Update ---");
    const orderB = await createTestOrder(student1Token, "CASH");
    const orderBId = (orderB._id || orderB.id).toString();

    await new Promise((resolve) => {
      student1Socket.emit("order:join", { orderId: orderBId }, resolve);
    });

    const sCancelEventPromise = waitForEvent(student1Socket, "order:updated");
    const cancelRes = await fetch(`${BASE_URL}/orders/${orderBId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ reason: "Changed my mind" }),
    });
    if (!cancelRes.ok) throw new Error("Student cancel order failed");

    const sCancelEvent = await sCancelEventPromise;
    if (sCancelEvent.orderStatus !== "CANCELLED" || sCancelEvent.cancelledBy !== "STUDENT") {
      throw new Error(`Unexpected cancel payload: ${JSON.stringify(sCancelEvent)}`);
    }
    logPass("Student cancellation emitted order:updated (CANCELLED, by STUDENT) in realtime");

    // ----------------------------------------------------
    // Step 6: Test 3 & 4 — Admin Cancels Order & Student Receives Update
    // ----------------------------------------------------
    console.log("\n--- 6. Testing Admin Cancellation Realtime Update ---");
    const orderC = await createTestOrder(student1Token, "CASH");
    const orderCId = (orderC._id || orderC.id).toString();

    await new Promise((resolve) => {
      student1Socket.emit("order:join", { orderId: orderCId }, resolve);
    });

    const aCancelEventPromise = waitForEvent(student1Socket, "order:updated");
    const adminCancelRes = await fetch(`${BASE_URL}/admin/orders/${orderCId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: "Kitchen out of ingredients" }),
    });
    if (!adminCancelRes.ok) throw new Error("Admin cancel order failed");

    const aCancelEvent = await aCancelEventPromise;
    if (
      aCancelEvent.orderStatus !== "CANCELLED" ||
      aCancelEvent.cancelledBy !== "ADMIN" ||
      aCancelEvent.cancellationReason !== "Kitchen out of ingredients"
    ) {
      throw new Error(`Unexpected admin cancel payload: ${JSON.stringify(aCancelEvent)}`);
    }
    logPass("Admin cancellation emitted order:updated with reason to student in realtime");

    // ----------------------------------------------------
    // Step 7: Test 6 — Online Payment Update Emits Correctly
    // ----------------------------------------------------
    console.log("\n--- 7. Testing Online Payment Realtime Update ---");
    const orderD = await createTestOrder(student1Token, "ONLINE");
    const orderDId = (orderD._id || orderD.id).toString();

    // Create payment transaction
    const payOrderRes = await fetch(`${BASE_URL}/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ orderId: orderDId }),
    });
    const payOrderData = await payOrderRes.json();
    const razorpayOrderId = payOrderData.data?.razorpayOrderId;
    if (!razorpayOrderId) throw new Error("createPaymentOrder failed to return razorpayOrderId");

    // Subscribe to order D
    await new Promise((resolve) => {
      student1Socket.emit("order:join", { orderId: orderDId }, resolve);
    });

    // Generate valid cryptographic test signature
    const dummyPaymentId = `pay_mock_${Date.now()}`;
    const signaturePayload = `${razorpayOrderId}|${dummyPaymentId}`;
    const validSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(signaturePayload)
      .digest("hex");

    const payUpdateEventPromise = waitForEvent(student1Socket, "order:updated");
    const verifyRes = await fetch(`${BASE_URL}/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        orderId: orderDId,
        razorpayPaymentId: dummyPaymentId,
        razorpayOrderId: razorpayOrderId,
        razorpaySignature: validSignature,
      }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) throw new Error(`Payment verification failed: ${JSON.stringify(verifyData)}`);

    const payUpdateEvent = await payUpdateEventPromise;
    if (payUpdateEvent.paymentStatus !== "PAID") {
      throw new Error(`Expected paymentStatus PAID, got ${payUpdateEvent.paymentStatus}`);
    }
    logPass("Online payment verification emitted order:updated (paymentStatus: PAID) in realtime");

    // ----------------------------------------------------
    // Step 8: Test 7 — Disconnect & Reconnect Resilience
    // ----------------------------------------------------
    console.log("\n--- 8. Testing Disconnect & Reconnect Handling ---");
    student1Socket.disconnect();
    if (student1Socket.connected) throw new Error("Socket did not disconnect");
    logPass("Student socket disconnected cleanly");

    student1Socket.connect();
    await new Promise((resolve) => {
      student1Socket.once("connect", resolve);
    });
    logPass("Student socket reconnected successfully");

    // Rejoin order D after reconnect
    const rejoinPromise = new Promise((resolve) => {
      student1Socket.emit("order:join", { orderId: orderDId }, resolve);
    });
    await rejoinPromise;
    logPass("Re-joined order room after reconnection successfully");

    // ----------------------------------------------------
    // Step 9: Test 10 — REST Operates Authentically Without Sockets
    // ----------------------------------------------------
    console.log("\n--- 9. Testing REST Fallback When Sockets Unavailable ---");
    // Disconnect all sockets completely
    student1Socket.disconnect();
    student2Socket.disconnect();
    adminSocket.disconnect();

    // Verify REST GET /api/orders/:id still works
    const restOrderRes = await fetch(`${BASE_URL}/orders/${orderDId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const restOrderData = await restOrderRes.json();
    if (!restOrderRes.ok || !restOrderData.data) {
      throw new Error("REST API failed while sockets disconnected");
    }
    const orderObj = restOrderData.data?.order || restOrderData.data;
    logPass(`Authoritative REST order retrieval succeeds independently (Order #${orderObj.orderNumber || orderDId})`);

    // Verify REST GET /api/orders still works
    const restMyOrdersRes = await fetch(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const restMyOrdersData = await restMyOrdersRes.json();
    const ordersList = restMyOrdersData.data?.orders || restMyOrdersData.orders || restMyOrdersData.data;
    if (!restMyOrdersRes.ok || !Array.isArray(ordersList)) {
      throw new Error(`REST API /api/orders failed while sockets disconnected: ${JSON.stringify(restMyOrdersData)}`);
    }
    logPass(`Authoritative REST orders list succeeds independently (${ordersList.length} orders retrieved)`);

    console.log("\n========================================================");
    console.log("   ALL PART 21 REALTIME SOCKET TESTS PASSED SUCCESSFULLY!");
    console.log("========================================================\n");
  } catch (err) {
    logFail("Test suite encountered an error", err);
  } finally {
    if (student1Socket) student1Socket.disconnect();
    if (student2Socket) student2Socket.disconnect();
    if (adminSocket) adminSocket.disconnect();
  }
};

runTests();
