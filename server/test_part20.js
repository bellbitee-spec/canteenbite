const crypto = require("crypto");

const BASE_URL = "http://localhost:5000/api";

const logPass = (title) => console.log(`\x1b[32m✔ PASS:\x1b[0m ${title}`);
const logFail = (title, err) => {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${title}`);
  if (err) console.error(err);
  process.exitCode = 1;
};

const runTests = async () => {
  console.log("\n========================================================");
  console.log("   STARTING PART 20 ORDER TRACKING & CANCELLATION TESTS");
  console.log("========================================================\n");

  let adminToken = null;
  let student1Token = null;
  let student2Token = null;
  let student1User = null;
  let student2User = null;
  let testProduct = null;

  try {
    // 1. Authenticate Roles
    console.log("--- 1. Authenticating Roles ---");
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@college.edu", password: "Admin@12345" }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data?.token || adminData.token;
    if (!adminToken) throw new Error("Admin authentication failed");
    logPass("Admin logged in successfully");

    // Student 1
    const s1Res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student_test@college.edu", password: "Student@12345" }),
    });
    const s1Data = await s1Res.json();
    student1Token = s1Data.data?.token || s1Data.token;
    student1User = s1Data.data?.user || s1Data.user;
    if (!student1Token) throw new Error("Student 1 authentication failed");
    logPass(`Student 1 logged in (${student1User.email})`);

    // Student 2 (for ownership verification)
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
    logPass(`Student 2 logged in (${student2User.email})`);

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

    // Fetch test product
    const prodRes = await fetch(`${BASE_URL}/products?limit=10`);
    const prodData = await prodRes.json();
    const allProducts = prodData.data?.products || prodData.products || [];
    testProduct = allProducts.find((p) => p.isAvailable && p.stock >= 10);
    if (!testProduct) throw new Error("No available product with stock >= 10");
    console.log(`Using product: "${testProduct.name}" (Price: ₹${testProduct.price})`);

    // 2. Orders Page / Order History API
    console.log("\n--- 2. Order History API & Schema Verification ---");
    const getOrdersRes = await fetch(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const getOrdersData = await getOrdersRes.json();
    const orderList = getOrdersData.data?.orders || getOrdersData.orders;
    if (getOrdersRes.status === 200 && Array.isArray(orderList)) {
      logPass(`GET /api/orders returns array of orders (${orderList.length} total)`);
    } else {
      throw new Error(`Failed to fetch orders: ${JSON.stringify(getOrdersData)}`);
    }

    // 3. New Order Creation & Initial State (PENDING, cancellationWindowOpen = true)
    console.log("\n--- 3. Order Placement & Authoritative 30s cancelUntil Deadline ---");
    const nowBeforeCreate = Date.now();
    const placeRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct.id || testProduct._id, quantity: 1 }],
        paymentMethod: "CASH",
        notes: "Part 20 tracking test note",
      }),
    });
    const placeData = await placeRes.json();
    const order1 = placeData.data?.order || placeData.order;
    const order1Id = order1.id || order1._id;

    if (placeRes.status === 201 && order1 && order1.orderNumber) {
      logPass(`Order placed: ${order1.orderNumber} (Status: ${order1.orderStatus})`);
    } else {
      throw new Error(`Failed to place order: ${JSON.stringify(placeData)}`);
    }

    // Check cancelUntil calculation
    const cancelUntilMs = new Date(order1.cancelUntil).getTime();
    const diffSeconds = Math.round((cancelUntilMs - nowBeforeCreate) / 1000);
    if (order1.cancellationWindowOpen === true && diffSeconds >= 28 && diffSeconds <= 32) {
      logPass(`Authoritative cancelUntil is set exactly ~30 seconds in the future (${diffSeconds}s remaining)`);
    } else {
      throw new Error(`Invalid cancelUntil window: diff = ${diffSeconds}s, open = ${order1.cancellationWindowOpen}`);
    }

    // Check historical snapshot integrity
    const firstItem = order1.items[0];
    if (
      firstItem &&
      firstItem.unitPrice === testProduct.price &&
      firstItem.quantity === 1 &&
      firstItem.subtotal === testProduct.price
    ) {
      logPass(`Historical item snapshot verified: ${firstItem.name} @ ₹${firstItem.unitPrice}`);
    } else {
      throw new Error(`Historical snapshot verification failed: ${JSON.stringify(firstItem)}`);
    }

    // 4. Order Details & Ownership Enforcement (401, 403, 404)
    console.log("\n--- 4. Order Details & Ownership Verification ---");
    // Without token -> 401
    const unauthRes = await fetch(`${BASE_URL}/orders/${order1Id}`);
    if (unauthRes.status === 401) {
      logPass("Unauthenticated request to GET /api/orders/:id returns 401 Unauthorized");
    } else {
      throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
    }

    // Student 2 accesses Student 1's order -> 403
    const forbiddenRes = await fetch(`${BASE_URL}/orders/${order1Id}`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    if (forbiddenRes.status === 403) {
      logPass("Cross-student access to GET /api/orders/:id returns 403 Forbidden");
    } else {
      throw new Error(`Expected 403 for cross-student access, got ${forbiddenRes.status}`);
    }

    // Non-existent ID -> 404
    const nonExistentId = "660000000000000000000000";
    const notFoundRes = await fetch(`${BASE_URL}/orders/${nonExistentId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    if (notFoundRes.status === 404) {
      logPass("Non-existent order ID returns 404 Not Found");
    } else {
      throw new Error(`Expected 404 for invalid order, got ${notFoundRes.status}`);
    }

    // Student 1 accesses own order -> 200
    const ownerRes = await fetch(`${BASE_URL}/orders/${order1Id}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const ownerData = await ownerRes.json();
    const fetchedOrder = ownerData.data?.order || ownerData.order;
    if (ownerRes.status === 200 && fetchedOrder.orderNumber === order1.orderNumber) {
      logPass("Owner access to GET /api/orders/:id returns 200 with full order details");
    } else {
      throw new Error(`Owner fetch failed: ${JSON.stringify(ownerData)}`);
    }

    // 5. Successful Student Cancellation Within 30s
    console.log("\n--- 5. Student Cancellation within 30-Second Window ---");
    const cancelRes = await fetch(`${BASE_URL}/orders/${order1Id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ reason: "Accidental order placement" }),
    });
    const cancelData = await cancelRes.json();
    const cancelledOrder = cancelData.data?.order || cancelData.order;

    if (
      cancelRes.status === 200 &&
      cancelledOrder.orderStatus === "CANCELLED" &&
      cancelledOrder.cancelledBy === "STUDENT" &&
      cancelledOrder.cancellationReason === "Accidental order placement" &&
      cancelledOrder.cancellationWindowOpen === false
    ) {
      logPass("Student successfully cancelled order within 30s window (orderStatus = CANCELLED)");
    } else {
      throw new Error(`Cancellation within window failed: ${JSON.stringify(cancelData)}`);
    }

    // 6. Double Cancellation Rejection
    console.log("\n--- 6. Double Cancellation Rejection ---");
    const doubleCancelRes = await fetch(`${BASE_URL}/orders/${order1Id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ reason: "Trying again" }),
    });
    const doubleCancelData = await doubleCancelRes.json();
    if (doubleCancelRes.status === 400 && doubleCancelData.success === false) {
      logPass(`Double cancellation rejected with HTTP 400: "${doubleCancelData.message}"`);
    } else {
      throw new Error(`Expected HTTP 400 for double cancellation, got ${doubleCancelRes.status}`);
    }

    // 7. Expired Cancellation Rejection
    console.log("\n--- 7. Expired Cancellation Rejection ---");
    // Place Order 2 with short store cancellation window or simulate expired deadline
    // Temporarily set cancellation window to 1 second
    await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ cancellationWindowSeconds: 1 }),
    });

    const order2Res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct.id || testProduct._id, quantity: 1 }],
        paymentMethod: "CASH",
        notes: "Expired window test order",
      }),
    });
    const order2 = (await order2Res.json()).data?.order;
    const order2Id = order2.id || order2._id;

    // Restore store setting to 30s
    await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ cancellationWindowSeconds: 30 }),
    });

    // Wait 1.5 seconds for the 1s window to definitely expire on the server
    console.log("Waiting 1.5s for 1-second cancellation window to expire on server...");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const expiredCancelRes = await fetch(`${BASE_URL}/orders/${order2Id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ reason: "Too late" }),
    });
    const expiredCancelData = await expiredCancelRes.json();

    if (
      expiredCancelRes.status === 400 &&
      expiredCancelData.success === false &&
      expiredCancelData.message.toLowerCase().includes("expired")
    ) {
      logPass(`Expired cancellation rejected with HTTP 400: "${expiredCancelData.message}"`);
    } else {
      throw new Error(`Expected HTTP 400 for expired cancellation, got ${expiredCancelRes.status}: ${JSON.stringify(expiredCancelData)}`);
    }

    // 8. Order Lifecycle Status Progression
    console.log("\n--- 8. Order Progression: CONFIRMED -> PREPARING -> DELAYED -> READY -> COMPLETED ---");
    // Place Order 3 to test status lifecycle
    const order3Res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct.id || testProduct._id, quantity: 1 }],
        paymentMethod: "CASH",
        notes: "Lifecycle progression order",
      }),
    });
    const order3Id = (await order3Res.json()).data?.order?.id;

    // Transition to CONFIRMED
    const confRes = await fetch(`${BASE_URL}/admin/orders/${order3Id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: "CONFIRMED" }),
    });
    if (confRes.status === 200) logPass("Order status updated to CONFIRMED (Order confirmed)");

    // Transition to PREPARING
    const prepRes = await fetch(`${BASE_URL}/admin/orders/${order3Id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: "PREPARING" }),
    });
    if (prepRes.status === 200) logPass("Order status updated to PREPARING (Being prepared, preparationStartedAt set)");

    // Transition to DELAYED
    const delayRes = await fetch(`${BASE_URL}/admin/orders/${order3Id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: "DELAYED" }),
    });
    if (delayRes.status === 200) logPass("Order status updated to DELAYED (Order running late, delayedAt set)");

    // Transition to READY
    const readyRes = await fetch(`${BASE_URL}/admin/orders/${order3Id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: "READY" }),
    });
    if (readyRes.status === 200) logPass("Order status updated to READY (Ready for pickup, readyAt set)");

    // Transition to COMPLETED
    const compRes = await fetch(`${BASE_URL}/admin/orders/${order3Id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    if (compRes.status === 200) logPass("Order status updated to COMPLETED (Completed, completedAt set)");

    // Verify student retrieves the completed order with all timestamps preserved
    const finalFetchRes = await fetch(`${BASE_URL}/orders/${order3Id}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const finalOrder = (await finalFetchRes.json()).data?.order;
    if (
      finalOrder.orderStatus === "COMPLETED" &&
      finalOrder.preparationStartedAt &&
      finalOrder.delayedAt &&
      finalOrder.readyAt &&
      finalOrder.completedAt
    ) {
      logPass("Student view preserves all authoritative lifecycle timestamps for timeline");
    } else {
      throw new Error(`Timeline timestamps verification failed: ${JSON.stringify(finalOrder)}`);
    }

    // 9. Admin Cancellation Reason Display
    console.log("\n--- 9. Admin Cancellation Reason Display ---");
    const order4Res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        items: [{ itemType: "PRODUCT", id: testProduct.id || testProduct._id, quantity: 1 }],
        paymentMethod: "CASH",
        notes: "Admin cancel order",
      }),
    });
    const order4Id = (await order4Res.json()).data?.order?.id;

    // Admin cancels with reason
    await fetch(`${BASE_URL}/admin/orders/${order4Id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: "Kitchen ran out of bread buns" }),
    });

    const adminCancelledFetch = (
      await (await fetch(`${BASE_URL}/orders/${order4Id}`, {
        headers: { Authorization: `Bearer ${student1Token}` },
      })).json()
    ).data?.order;

    if (
      adminCancelledFetch.orderStatus === "CANCELLED" &&
      adminCancelledFetch.cancelledBy === "ADMIN" &&
      adminCancelledFetch.cancellationReason === "Kitchen ran out of bread buns"
    ) {
      logPass("Admin cancellation details stored: cancelledBy = ADMIN, reason displayed correctly");
    } else {
      throw new Error(`Admin cancellation verification failed: ${JSON.stringify(adminCancelledFetch)}`);
    }

    console.log("\n========================================================");
    console.log("   ALL PART 20 ORDER TRACKING & CANCELLATION TESTS PASSED!");
    console.log("========================================================\n");
  } catch (err) {
    logFail("Test suite failed with an exception", err);
  }
};

runTests();
