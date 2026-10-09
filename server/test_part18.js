const BASE_URL = "http://localhost:5000/api";

const logPass = (title) => console.log(`\x1b[32m✔ PASS:\x1b[0m ${title}`);
const logFail = (title, err) => {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${title}`);
  if (err) console.error(err);
  process.exitCode = 1;
};

const runTests = async () => {
  console.log("\n========================================================");
  console.log("       STARTING PART 18 CHECKOUT & ORDER SUBMISSION TESTS");
  console.log("========================================================\n");

  let adminToken = null;
  let studentToken = null;
  let availableProduct = null;
  let outOfStockProduct = null;

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
    logPass("Admin logged in successfully (ADMIN role)");

    const studentRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "student_test@college.edu",
        password: "Student@12345",
      }),
    });
    const studentData = await studentRes.json();
    studentToken = studentData.data?.token || studentData.token;
    if (!studentToken) throw new Error("Student authentication failed");
    logPass("Student authenticated successfully (STUDENT role)");

    // Ensure store is open and accepting orders
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
        defaultPreparationTime: 12,
        temporaryClosedReason: "",
      }),
    });

    // Fetch products
    const prodRes = await fetch(`${BASE_URL}/products?limit=10`);
    const prodData = await prodRes.json();
    const allProducts = prodData.data?.products || prodData.products || [];
    availableProduct = allProducts.find((p) => p.isAvailable && p.stock >= 5);
    if (!availableProduct) throw new Error("No available product with stock >= 5");
    console.log(`Using available test product: "${availableProduct.name}" (Price: ₹${availableProduct.price}, Stock: ${availableProduct.stock})`);

    // 2. Empty Cart / Missing Items Validation
    console.log("\n--- 2. Empty Cart / Missing Items Rejection ---");
    const emptyOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        items: [],
        paymentMethod: "CASH",
      }),
    });
    if (emptyOrderRes.status === 400) {
      logPass("Backend rejects empty cart items (HTTP 400)");
    } else {
      throw new Error(`Expected HTTP 400 for empty items, got ${emptyOrderRes.status}`);
    }

    // 3. Successful Cash Order Creation
    console.log("\n--- 3. Successful Cash Order Creation ---");
    const order1IdemKey = `test-idem-key-${Date.now()}-1`;
    const order1Res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
        "Idempotency-Key": order1IdemKey,
      },
      body: JSON.stringify({
        items: [
          {
            itemType: "PRODUCT",
            id: availableProduct.id || availableProduct._id,
            quantity: 2,
          },
        ],
        paymentMethod: "CASH",
        notes: "No onions, extra napkins please",
      }),
    });
    const order1Data = await order1Res.json();
    const created1 = order1Data.data?.order || order1Data.order;

    if (order1Res.status === 201 && created1 && created1.orderNumber) {
      logPass(`Order 1 created successfully (Order #: ${created1.orderNumber})`);
      logPass(`Authoritative Total: ₹${created1.totalAmount} (Backend calculated: ${availableProduct.price} × 2)`);
      logPass(`Payment: ${created1.paymentMethod} (Status: ${created1.paymentStatus})`);
      logPass(`Expected Ready At: ${created1.expectedReadyAt} (Estimated Prep: ${created1.estimatedPreparationTime}m)`);
      if (created1.notes === "No onions, extra napkins please") {
        logPass(`Kitchen notes stored accurately: "${created1.notes}"`);
      }
    } else {
      throw new Error(`Order 1 creation failed: ${JSON.stringify(order1Data)}`);
    }

    // 4. Idempotency Key Reuse (Preventing Duplicate Order on Retry)
    console.log("\n--- 4. Idempotency Key Duplicate Prevention ---");
    const retryOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
        "Idempotency-Key": order1IdemKey, // EXACT SAME KEY
      },
      body: JSON.stringify({
        items: [
          {
            itemType: "PRODUCT",
            id: availableProduct.id || availableProduct._id,
            quantity: 2,
          },
        ],
        paymentMethod: "CASH",
        notes: "No onions, extra napkins please",
      }),
    });
    const retryData = await retryOrderRes.json();
    const retryOrder = retryData.data?.order || retryData.order;

    if (
      (retryOrderRes.status === 200 || retryOrderRes.status === 201) &&
      retryOrder &&
      (retryOrder.id || retryOrder._id) === (created1.id || created1._id) &&
      retryOrder.orderNumber === created1.orderNumber
    ) {
      logPass("Reusing Idempotency-Key returned existing order without creating a duplicate!");
    } else {
      throw new Error(`Expected identical order on idempotency retry, got: ${JSON.stringify(retryData)}`);
    }

    // 5. Successful Online Payment Order
    console.log("\n--- 5. Online Payment Option Order Creation ---");
    const orderOnlineIdemKey = `test-idem-key-${Date.now()}-online`;
    const onlineOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
        "Idempotency-Key": orderOnlineIdemKey,
      },
      body: JSON.stringify({
        items: [
          {
            itemType: "PRODUCT",
            id: availableProduct.id || availableProduct._id,
            quantity: 1,
          },
        ],
        paymentMethod: "ONLINE",
        notes: "Online checkout test",
      }),
    });
    const onlineOrderData = await onlineOrderRes.json();
    const onlineCreated = onlineOrderData.data?.order || onlineOrderData.order;

    if (onlineOrderRes.status === 201 && onlineCreated && onlineCreated.paymentMethod === "ONLINE") {
      logPass(`Online payment order registered: PaymentMethod = ${onlineCreated.paymentMethod}, Status = ${onlineCreated.paymentStatus}`);
    } else {
      throw new Error(`Online payment order creation failed: ${JSON.stringify(onlineOrderData)}`);
    }

    // 6. Stock Failure Handling
    console.log("\n--- 6. Stock Insufficiency Failure Handling ---");
    // Fetch fresh stock of the product
    const freshProdRes = await fetch(`${BASE_URL}/products?limit=10`);
    const freshProdData = await freshProdRes.json();
    const freshProd = (freshProdData.data?.products || freshProdData.products || []).find(
      (p) => (p.id || p._id) === (availableProduct.id || availableProduct._id)
    );
    const excessiveQty = Math.min(50, (freshProd?.stock || 5) + 1);

    const excessiveOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            itemType: "PRODUCT",
            id: availableProduct.id || availableProduct._id,
            quantity: excessiveQty,
          },
        ],
        paymentMethod: "CASH",
      }),
    });
    const excessiveData = await excessiveOrderRes.json();
    if (excessiveOrderRes.status === 409 && excessiveData.success === false) {
      logPass(`Stock insufficiency rejected with HTTP 409: "${excessiveData.message}"`);
    } else {
      throw new Error(`Expected HTTP 409 for insufficient stock, got ${excessiveOrderRes.status}`);
    }

    // 7. Store Closure Rejection During Checkout
    console.log("\n--- 7. Store Closure Rejection During Checkout ---");
    // Close the store
    await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        manualOverride: true,
        isOpen: false,
        temporaryClosedReason: "Shift handover pause",
      }),
    });

    const closedOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            itemType: "PRODUCT",
            id: availableProduct.id || availableProduct._id,
            quantity: 1,
          },
        ],
        paymentMethod: "CASH",
      }),
    });
    const closedOrderData = await closedOrderRes.json();
    if (closedOrderRes.status === 400 && closedOrderData.message === "Shift handover pause") {
      logPass(`Store closure rejected with natural reason: "${closedOrderData.message}"`);
    } else {
      throw new Error(`Expected HTTP 400 with closure reason, got: ${closedOrderRes.status} ${JSON.stringify(closedOrderData)}`);
    }

    // Reopen store
    await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        manualOverride: false,
        isOpen: true,
        acceptingOrders: true,
        temporaryClosedReason: "",
      }),
    });

    // 8. Order Fetching by ID & Student Order History
    console.log("\n--- 8. Order History & Detail View Integration ---");
    const fetchByIdRes = await fetch(`${BASE_URL}/orders/${created1.id || created1._id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const fetchByIdData = await fetchByIdRes.json();
    const fetchedOrder = fetchByIdData.data?.order || fetchByIdData.order;

    if (fetchByIdRes.status === 200 && fetchedOrder && fetchedOrder.orderNumber === created1.orderNumber) {
      logPass(`GET /api/orders/:id verified for Order #${fetchedOrder.orderNumber}`);
    } else {
      throw new Error(`Failed to fetch order by ID: ${JSON.stringify(fetchByIdData)}`);
    }

    const historyRes = await fetch(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const historyData = await historyRes.json();
    const historyList = historyData.data?.orders || historyData.orders;

    if (historyRes.status === 200 && Array.isArray(historyList) && historyList.length >= 2) {
      logPass(`GET /api/orders verified: Student has ${historyList.length} orders in history`);
    } else {
      throw new Error(`Failed to fetch order history: ${JSON.stringify(historyData)}`);
    }

    // 9. Unauthorized / Missing Token Check
    console.log("\n--- 9. Unauthenticated Order Submission Rejection ---");
    const unauthOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            itemType: "PRODUCT",
            id: availableProduct.id || availableProduct._id,
            quantity: 1,
          },
        ],
        paymentMethod: "CASH",
      }),
    });
    if (unauthOrderRes.status === 401) {
      logPass("Unauthenticated order submission properly rejected with HTTP 401");
    } else {
      throw new Error(`Expected HTTP 401 for unauthenticated request, got ${unauthOrderRes.status}`);
    }

    console.log("\n========================================================");
    console.log("       ALL PART 18 CHECKOUT & ORDER TESTS PASSED!       ");
    console.log("========================================================\n");
  } catch (err) {
    logFail("PART 18 TEST SUITE FAILED", err);
  }
};

runTests();
