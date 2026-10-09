const BASE_URL = "http://localhost:5000/api";

const logPass = (title) => console.log(`\x1b[32m✔ PASS:\x1b[0m ${title}`);
const logFail = (title, err) => {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${title}`);
  if (err) console.error(err);
  process.exitCode = 1;
};

const runTests = async () => {
  console.log("\n========================================================");
  console.log("       STARTING PART 17 INTEGRATION & STORE UI TESTS     ");
  console.log("========================================================\n");

  let adminToken = null;
  let superAdminToken = null;
  let studentToken = null;
  let testProduct = null;

  try {
    // 1. Authenticate All Test Users
    console.log("--- 1. Authenticating Roles ---");

    // Admin
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

    // Super Admin (check if exists or login)
    let superRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "superadmin_p10@canteen.com",
        password: "Admin@12345",
      }),
    });
    if (superRes.ok) {
      const superData = await superRes.json();
      superAdminToken = superData.data?.token || superData.token;
      logPass("SuperAdmin logged in successfully (SUPER_ADMIN role)");
    } else {
      console.log("Note: SuperAdmin test using Admin token which shares full store management perms");
      superAdminToken = adminToken;
    }

    // Student
    let studentRes = await fetch(`${BASE_URL}/auth/login`, {
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

    // Fetch product
    const prodRes = await fetch(`${BASE_URL}/products?limit=5`);
    const prodData = await prodRes.json();
    testProduct = (prodData.data?.products || prodData.products || [])[0];
    if (!testProduct) throw new Error("No test product found");

    // 2. Student Storefront Status API Tests
    console.log("\n--- 2. Student Storefront Integration Tests ---");

    // Ensure reset to default open schedule
    await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        storeName: "College Canteen",
        manualOverride: false,
        isOpen: true,
        acceptingOrders: true,
        defaultPreparationTime: 10,
        cancellationWindowSeconds: 30,
        temporaryClosedReason: "",
      }),
    });

    // Test 2.1: Store open + accepting orders
    const status1 = await (await fetch(`${BASE_URL}/store/status`)).json();
    const s1Data = status1.data || status1.store;
    if (s1Data.isOpen && s1Data.acceptingOrders && s1Data.canOrder) {
      logPass("Student status: Store open + accepting orders (canOrder === true)");
    } else {
      throw new Error(`Unexpected status 1: ${JSON.stringify(s1Data)}`);
    }

    // Test 2.2: Store open + orders paused
    await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        manualOverride: true,
        isOpen: true,
        acceptingOrders: false,
      }),
    });

    const status2 = await (await fetch(`${BASE_URL}/store/status`)).json();
    const s2Data = status2.data || status2.store;
    if (s2Data.isOpen && !s2Data.acceptingOrders && !s2Data.canOrder) {
      logPass("Student status: Store open + orders paused (isOpen: true, canOrder: false)");
      if (s2Data.reason) {
        logPass(`Pause reason correctly supplied: "${s2Data.reason}"`);
      }
    } else {
      throw new Error(`Unexpected status 2: ${JSON.stringify(s2Data)}`);
    }

    // Test 2.3: Store closed with custom reason
    await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        manualOverride: true,
        isOpen: false,
        temporaryClosedReason: "Staff training workshop until 3 PM",
      }),
    });

    const status3 = await (await fetch(`${BASE_URL}/store/status`)).json();
    const s3Data = status3.data || status3.store;
    if (!s3Data.isOpen && !s3Data.canOrder && s3Data.reason === "Staff training workshop until 3 PM") {
      logPass("Student status: Store closed with custom reason (canOrder: false)");
    } else {
      throw new Error(`Unexpected status 3: ${JSON.stringify(s3Data)}`);
    }

    // Test 2.4: Products & Categories still accessible while store closed (browsing not blocked)
    const browseRes = await fetch(`${BASE_URL}/products`);
    if (browseRes.status === 200) {
      logPass("Products catalog browsing is fully functional while store is closed");
    } else {
      throw new Error(`Catalog browsing failed during closure: ${browseRes.status}`);
    }

    // Test 2.5: Order submission during closed store rejected with natural backend reason
    const tryOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            itemType: "PRODUCT",
            id: testProduct.id || testProduct._id,
            quantity: 1,
          },
        ],
        paymentMethod: "CASH",
      }),
    });
    const tryOrderData = await tryOrderRes.json();
    if (tryOrderRes.status === 400 && tryOrderData.message === "Staff training workshop until 3 PM") {
      logPass("Student order submission properly rejected by backend with natural reason");
    } else {
      throw new Error(`Expected HTTP 400 with closure reason, got: ${tryOrderRes.status} ${JSON.stringify(tryOrderData)}`);
    }

    // 3. Admin Store Controls & Settings Tests
    console.log("\n--- 3. Admin Store Controls & Management API Tests ---");

    // Test 3.1: Admin store settings loads
    const getSettingsRes = await fetch(`${BASE_URL}/admin/store/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getSettingsData = await getSettingsRes.json();
    const curSettings = getSettingsData.data?.settings || getSettingsData.settings;
    if (getSettingsRes.status === 200 && curSettings && curSettings.storeName) {
      logPass("Admin store settings loads successfully");
    } else {
      throw new Error(`Failed to load admin settings: ${JSON.stringify(getSettingsData)}`);
    }

    // Test 3.2: Manual open works
    const openRes = await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        manualOverride: true,
        isOpen: true,
        acceptingOrders: true,
      }),
    });
    if (openRes.status === 200) {
      logPass("Manual open store control succeeds");
    } else {
      throw new Error("Manual open store failed");
    }

    // Test 3.3: Manual close works with closure reason
    const closeRes = await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        manualOverride: true,
        isOpen: false,
        temporaryClosedReason: "End of shift maintenance",
      }),
    });
    if (closeRes.status === 200) {
      logPass("Manual close store control with reason succeeds");
    } else {
      throw new Error("Manual close store failed");
    }

    // Test 3.4: Use schedule works
    const schedModeRes = await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        manualOverride: false,
      }),
    });
    if (schedModeRes.status === 200) {
      logPass("Use Schedule control succeeds (manualOverride: false)");
    } else {
      throw new Error("Switch to schedule mode failed");
    }

    // Test 3.5: Weekly schedule loads
    const getSchedRes = await fetch(`${BASE_URL}/admin/store/schedule`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const schedData = await getSchedRes.json();
    const daysList = schedData.data?.schedule || schedData.schedule;
    if (getSchedRes.status === 200 && Array.isArray(daysList) && daysList.length === 7) {
      logPass("Weekly schedule loads all 7 days");
    } else {
      throw new Error("Failed to load 7-day schedule");
    }

    // Test 3.6: Weekly schedule edits & invalid rejection
    const invalidSchedRes = await fetch(`${BASE_URL}/admin/store/schedule`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        entries: [
          { dayOfWeek: 2, isOpen: true, openingTime: "17:00", closingTime: "08:00" },
        ],
      }),
    });
    if (invalidSchedRes.status === 400) {
      logPass("Invalid schedule hours rejected (closingTime <= openingTime)");
    } else {
      throw new Error(`Expected 400 for inverted hours, got ${invalidSchedRes.status}`);
    }

    // Valid schedule update
    const validSchedRes = await fetch(`${BASE_URL}/admin/store/schedule`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        entries: [
          { dayOfWeek: 2, isOpen: true, openingTime: "08:00", closingTime: "17:00" },
        ],
      }),
    });
    if (validSchedRes.status === 200) {
      logPass("Valid weekly schedule update succeeds");
    } else {
      throw new Error("Failed to update valid schedule");
    }

    // Test 3.7: General Settings (storeName, defaultPreparationTime)
    const updateGeneralRes = await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        storeName: "College Canteen Central",
        defaultPreparationTime: 15,
      }),
    });
    const updateGeneralData = await updateGeneralRes.json();
    const gSettings = updateGeneralData.data?.settings || updateGeneralData.settings;
    if (updateGeneralRes.status === 200 && gSettings.storeName === "College Canteen Central" && gSettings.defaultPreparationTime === 15) {
      logPass("Store name and defaultPreparationTime updated successfully");
    } else {
      throw new Error(`Failed to update general settings: ${JSON.stringify(updateGeneralData)}`);
    }

    // Test 3.8: Ordering Settings (cancellationWindowSeconds)
    const updateCancelRes = await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        cancellationWindowSeconds: 45,
      }),
    });
    const updateCancelData = await updateCancelRes.json();
    const cSettings = updateCancelData.data?.settings || updateCancelData.settings;
    if (updateCancelRes.status === 200 && cSettings.cancellationWindowSeconds === 45) {
      logPass("cancellationWindowSeconds updated successfully to 45 seconds");
    } else {
      throw new Error(`Failed to update cancellation window: ${JSON.stringify(updateCancelData)}`);
    }

    // Test 3.9: Student access to admin store controls is DENIED (403)
    const studentDeniedRes = await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ storeName: "Hacked Canteen" }),
    });
    if (studentDeniedRes.status === 403) {
      logPass("Student denied access to admin store controls (403 Forbidden)");
    } else {
      throw new Error(`Expected 403 for student modification, got ${studentDeniedRes.status}`);
    }

    // 4. Cleanup & Restore
    console.log("\n--- 4. Restoring Initial Defaults ---");
    await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        storeName: "College Canteen",
        manualOverride: false,
        isOpen: true,
        acceptingOrders: true,
        defaultPreparationTime: 10,
        cancellationWindowSeconds: 30,
        temporaryClosedReason: "",
      }),
    });
    logPass("Default canteen operations restored (manualOverride: false, acceptingOrders: true)");

    console.log("\n========================================================");
    console.log("       ALL PART 17 INTEGRATION TESTS PASSED!            ");
    console.log("========================================================\n");
  } catch (err) {
    logFail("PART 17 TEST SUITE FAILED", err);
  }
};

runTests();
