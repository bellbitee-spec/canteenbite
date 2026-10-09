const mongoose = require("mongoose");
const StoreSettings = require("./src/models/StoreSettings");
const StoreSchedule = require("./src/models/StoreSchedule");
const User = require("./src/models/User");
const Product = require("./src/models/Product");
const Category = require("./src/models/Category");
const storeService = require("./src/services/storeService");

const BASE_URL = "http://localhost:5000/api";

const logPass = (title) => console.log(`\x1b[32m✔ PASS:\x1b[0m ${title}`);
const logFail = (title, err) => {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${title}`);
  if (err) console.error(err);
  process.exitCode = 1;
};

const runTests = async () => {
  console.log("\n========================================================");
  console.log("       STARTING PART 16 STORE SCHEDULE & STATUS TESTS   ");
  console.log("========================================================\n");

  let adminToken = null;
  let studentToken = null;
  let testProduct = null;

  try {
    // 1. Authenticate Admin and Student
    console.log("--- 1. Authenticating Test Users ---");
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@college.edu",
        password: "Admin@12345",
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.data?.token || adminLoginData.token;
    if (!adminLoginRes.ok || !adminToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
    }
    logPass("Admin logged in successfully");

    let studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "student_test@college.edu",
        password: "Student@12345",
      }),
    });
    if (!studentLoginRes.ok) {
      const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Student",
          email: "student_test@college.edu",
          password: "Student@12345",
        }),
      });
      const regData = await regRes.json();
      studentToken = regData.data?.token || regData.token;
      if (!regRes.ok || !studentToken) {
        throw new Error(`Student registration failed: ${JSON.stringify(regData)}`);
      }
    } else {
      const studentLoginData = await studentLoginRes.json();
      studentToken = studentLoginData.data?.token || studentLoginData.token;
    }
    logPass("Student authenticated successfully");

    // Fetch an available product for ordering tests
    const prodRes = await fetch(`${BASE_URL}/products?limit=5`);
    const prodData = await prodRes.json();
    testProduct = (prodData.data?.products || prodData.products || []).find(
      (p) => p.isAvailable && p.stock > 5
    );
    if (!testProduct) {
      throw new Error("No suitable test product found with stock > 5");
    }
    console.log(`Using test product: "${testProduct.name}" (ID: ${testProduct.id || testProduct._id})`);

    // 2. Unit Testing: storeService calculateNextOpeningTime & timezone helpers
    console.log("\n--- 2. storeService Unit Tests (Next Opening Time & Timezone) ---");
    const testEntries = [
      { dayOfWeek: 0, isOpen: false, openingTime: "09:00", closingTime: "18:00" }, // Sun closed
      { dayOfWeek: 1, isOpen: true, openingTime: "09:00", closingTime: "18:00" },  // Mon open
      { dayOfWeek: 2, isOpen: true, openingTime: "09:00", closingTime: "18:00" },  // Tue open
      { dayOfWeek: 3, isOpen: true, openingTime: "09:00", closingTime: "18:00" },  // Wed open
      { dayOfWeek: 4, isOpen: true, openingTime: "09:00", closingTime: "18:00" },  // Thu open
      { dayOfWeek: 5, isOpen: true, openingTime: "09:00", closingTime: "18:00" },  // Fri open
      { dayOfWeek: 6, isOpen: true, openingTime: "09:00", closingTime: "18:00" },  // Sat open
    ];

    // Case A: Before opening on Thursday (07:30) -> opens today at 09:00
    const thuMorning = { dayOfWeek: 4, timeStr: "07:30", year: 2026, month: 10, day: 8 };
    const nextA = storeService.calculateNextOpeningTime(testEntries, thuMorning);
    if (nextA && nextA.toISOString() === "2026-10-08T03:30:00.000Z") {
      logPass("calculateNextOpeningTime correctly calculates today morning opening (09:00 IST = 03:30 UTC)");
    } else {
      throw new Error(`Unexpected nextA: ${nextA?.toISOString()}`);
    }

    // Case B: After closing on Thursday (19:30) -> opens Friday at 09:00
    const thuNight = { dayOfWeek: 4, timeStr: "19:30", year: 2026, month: 10, day: 8 };
    const nextB = storeService.calculateNextOpeningTime(testEntries, thuNight);
    if (nextB && nextB.toISOString() === "2026-10-09T03:30:00.000Z") {
      logPass("calculateNextOpeningTime correctly calculates next day opening (Friday 09:00 IST)");
    } else {
      throw new Error(`Unexpected nextB: ${nextB?.toISOString()}`);
    }

    // Case C: After closing on Saturday (19:30) -> skips Sunday, opens Monday at 09:00
    const satNight = { dayOfWeek: 6, timeStr: "19:30", year: 2026, month: 10, day: 10 };
    const nextC = storeService.calculateNextOpeningTime(testEntries, satNight);
    if (nextC && nextC.toISOString() === "2026-10-12T03:30:00.000Z") {
      logPass("calculateNextOpeningTime skips closed Sunday and targets Monday 09:00 IST");
    } else {
      throw new Error(`Unexpected nextC: ${nextC?.toISOString()}`);
    }

    // 3. Public Endpoints
    console.log("\n--- 3. Public API Endpoints ---");
    const pubStatusRes = await fetch(`${BASE_URL}/store/status`);
    const pubStatusData = await pubStatusRes.json();
    if (
      pubStatusRes.status === 200 &&
      pubStatusData.success === true &&
      pubStatusData.data &&
      pubStatusData.data.timezone === "Asia/Kolkata" &&
      typeof pubStatusData.data.isOpen === "boolean" &&
      typeof pubStatusData.data.canOrder === "boolean"
    ) {
      logPass("GET /api/store/status returns 200 and authoritative status schema");
    } else {
      throw new Error(`GET /api/store/status invalid response: ${JSON.stringify(pubStatusData)}`);
    }

    const pubSchedRes = await fetch(`${BASE_URL}/store/schedule`);
    const pubSchedData = await pubSchedRes.json();
    const schedList = pubSchedData.data?.schedule || pubSchedData.schedule;
    if (
      pubSchedRes.status === 200 &&
      pubSchedData.success === true &&
      Array.isArray(schedList) &&
      schedList.length === 7
    ) {
      logPass("GET /api/store/schedule returns 200 and all 7 weekly days");
    } else {
      throw new Error(`GET /api/store/schedule invalid response: ${JSON.stringify(pubSchedData)}`);
    }

    // 4. Admin Access & RBAC Controls
    console.log("\n--- 4. RBAC & Access Control on Admin Store Endpoints ---");
    // Without token
    const noAuthRes = await fetch(`${BASE_URL}/admin/store/status`);
    if (noAuthRes.status === 401) {
      logPass("GET /api/admin/store/status without token returns 401 Unauthorized");
    } else {
      throw new Error(`Expected 401, got ${noAuthRes.status}`);
    }

    // With Student token
    const studentAuthRes = await fetch(`${BASE_URL}/admin/store/status`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    if (studentAuthRes.status === 403) {
      logPass("GET /api/admin/store/status with STUDENT token returns 403 Forbidden");
    } else {
      throw new Error(`Expected 403, got ${studentAuthRes.status}`);
    }

    // With Admin token
    const adminAuthRes = await fetch(`${BASE_URL}/admin/store/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (adminAuthRes.status === 200) {
      logPass("GET /api/admin/store/status with ADMIN token returns 200 OK");
    } else {
      throw new Error(`Expected 200, got ${adminAuthRes.status}`);
    }

    // 5. Admin Schedule Retrieval & Validation
    console.log("\n--- 5. Admin Schedule Management & Validation ---");
    const adminSchedRes = await fetch(`${BASE_URL}/admin/store/schedule`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminSchedData = await adminSchedRes.json();
    if (adminSchedRes.status === 200 && adminSchedData.success) {
      logPass("GET /api/admin/store/schedule returns 200 for Admin");
    } else {
      throw new Error(`GET /api/admin/store/schedule failed: ${JSON.stringify(adminSchedData)}`);
    }

    // Validation: closingTime <= openingTime
    const badTimeRes = await fetch(`${BASE_URL}/admin/store/schedule`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        entries: [
          { dayOfWeek: 1, isOpen: true, openingTime: "18:00", closingTime: "09:00" },
        ],
      }),
    });
    if (badTimeRes.status === 400) {
      logPass("PATCH /api/admin/store/schedule rejects closingTime <= openingTime (400)");
    } else {
      throw new Error(`Expected 400 for inverted hours, got ${badTimeRes.status}`);
    }

    // Validation: invalid dayOfWeek
    const badDayRes = await fetch(`${BASE_URL}/admin/store/schedule`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        entries: [
          { dayOfWeek: 9, isOpen: true, openingTime: "09:00", closingTime: "18:00" },
        ],
      }),
    });
    if (badDayRes.status === 400) {
      logPass("PATCH /api/admin/store/schedule rejects invalid dayOfWeek 9 (400)");
    } else {
      throw new Error(`Expected 400 for bad dayOfWeek, got ${badDayRes.status}`);
    }

    // Valid update: set Monday to 08:30 - 19:30
    const validPatchSchedRes = await fetch(`${BASE_URL}/admin/store/schedule`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        entries: [
          { dayOfWeek: 1, isOpen: true, openingTime: "08:30", closingTime: "19:30" },
        ],
      }),
    });
    const validPatchData = await validPatchSchedRes.json();
    const updatedEntries = validPatchData.data?.schedule || validPatchData.schedule;
    const monEntry = updatedEntries?.find((e) => e.dayOfWeek === 1);
    if (
      validPatchSchedRes.status === 200 &&
      monEntry &&
      monEntry.openingTime === "08:30" &&
      monEntry.closingTime === "19:30"
    ) {
      logPass("PATCH /api/admin/store/schedule successfully updates Monday hours to 08:30 - 19:30");
    } else {
      throw new Error(`Schedule update failed: ${JSON.stringify(validPatchData)}`);
    }

    // 6. Admin Store Settings Management & Order Enforcement
    console.log("\n--- 6. Admin Store Settings & Order Rejection Enforcement ---");
    // Ensure clean initial settings
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
        defaultPreparationTime: 12,
        temporaryClosedReason: "",
      }),
    });

    // Test A: Manual Override Closed with Reason
    console.log("Setting manualOverride = true, isOpen = false, reason = 'Kitchen Sanitization'...");
    const closeOverrideRes = await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        manualOverride: true,
        isOpen: false,
        temporaryClosedReason: "Kitchen Sanitization in progress.",
      }),
    });
    const closeOverrideData = await closeOverrideRes.json();
    if (closeOverrideRes.status !== 200) {
      throw new Error(`Failed to set manual close override: ${JSON.stringify(closeOverrideData)}`);
    }

    // Verify GET /api/store/status reports closed
    const statusAfterClose = await (await fetch(`${BASE_URL}/store/status`)).json();
    if (
      statusAfterClose.data.isOpen === false &&
      statusAfterClose.data.canOrder === false &&
      statusAfterClose.data.reason === "Kitchen Sanitization in progress."
    ) {
      logPass("Store status immediately reflects manualOverride=true, isOpen=false with custom reason");
    } else {
      throw new Error(`Unexpected status after manual close: ${JSON.stringify(statusAfterClose)}`);
    }

    // Verify Student Order Attempt is REJECTED with 400
    const orderWhenClosedRes = await fetch(`${BASE_URL}/orders`, {
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
        notes: "Trying to order while store is closed",
      }),
    });
    const orderWhenClosedData = await orderWhenClosedRes.json();
    if (
      orderWhenClosedRes.status === 400 &&
      orderWhenClosedData.success === false &&
      orderWhenClosedData.message === "Kitchen Sanitization in progress."
    ) {
      logPass("Student order REJECTED (HTTP 400) when canteen is manually closed");
    } else {
      throw new Error(`Expected HTTP 400 with custom reason, got: ${orderWhenClosedRes.status} ${JSON.stringify(orderWhenClosedData)}`);
    }

    // Test B: Accepting Orders Toggled OFF (while store is otherwise open)
    console.log("\nSetting manualOverride = true, isOpen = true, acceptingOrders = false...");
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

    const statusAfterPause = await (await fetch(`${BASE_URL}/store/status`)).json();
    if (
      statusAfterPause.data.isOpen === true &&
      statusAfterPause.data.acceptingOrders === false &&
      statusAfterPause.data.canOrder === false
    ) {
      logPass("Store status reflects isOpen=true, acceptingOrders=false, canOrder=false");
    } else {
      throw new Error(`Unexpected status after order pause: ${JSON.stringify(statusAfterPause)}`);
    }

    // Verify order rejected when acceptingOrders = false
    const orderWhenPausedRes = await fetch(`${BASE_URL}/orders`, {
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
    const orderWhenPausedData = await orderWhenPausedRes.json();
    if (orderWhenPausedRes.status === 400 && orderWhenPausedData.success === false) {
      logPass("Student order REJECTED (HTTP 400) when acceptingOrders is paused");
    } else {
      throw new Error(`Expected HTTP 400 when acceptingOrders=false, got: ${orderWhenPausedRes.status}`);
    }

    // Test C: Restore Normal Operations and Test Successful Order & Cancellation Window
    console.log("\nRestoring acceptingOrders = true, manualOverride = true, isOpen = true...");
    await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        manualOverride: true,
        isOpen: true,
        acceptingOrders: true,
        temporaryClosedReason: "",
      }),
    });

    const statusOpen = await (await fetch(`${BASE_URL}/store/status`)).json();
    if (statusOpen.data.canOrder === true) {
      logPass("Store restored to canOrder = true");
    } else {
      throw new Error(`Failed to restore store to open state: ${JSON.stringify(statusOpen)}`);
    }

    // Student places an order
    const orderRes = await fetch(`${BASE_URL}/orders`, {
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
        notes: "Part 16 test order",
      }),
    });
    const orderData = await orderRes.json();
    const createdOrder = orderData.data?.order || orderData.order;
    if (orderRes.status === 201 && createdOrder && createdOrder.id) {
      logPass(`Order placed successfully (ID: ${createdOrder.id}, Prep Time: ${createdOrder.estimatedPreparationTime}m)`);
    } else {
      throw new Error(`Order placement failed: ${JSON.stringify(orderData)}`);
    }

    // Test D: Close store, verify existing order is NOT affected and cancellation window still works
    console.log("\nClosing store immediately after order placement...");
    await fetch(`${BASE_URL}/admin/store/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        manualOverride: true,
        isOpen: false,
        temporaryClosedReason: "End of shift closure",
      }),
    });

    // Student cancels the order within 30 seconds
    const cancelRes = await fetch(`${BASE_URL}/orders/${createdOrder.id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ reason: "Student changed mind within 30s" }),
    });
    const cancelData = await cancelRes.json();
    if (cancelRes.status === 200 && cancelData.success === true) {
      logPass("Student order cancellation within 30s still SUCCEEDS even after store closes");
    } else {
      throw new Error(`Cancellation failed after store closure: ${JSON.stringify(cancelData)}`);
    }

    // 7. Cleanup & Restore settings to schedule-driven default
    console.log("\n--- 7. Restoring Standard Store Defaults ---");
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
        temporaryClosedReason: "",
      }),
    });
    logPass("Default settings restored (manualOverride: false, acceptingOrders: true)");

    console.log("\n========================================================");
    console.log("       ALL PART 16 STORE SCHEDULE TESTS PASSED!         ");
    console.log("========================================================\n");
  } catch (err) {
    logFail("PART 16 TEST SUITE FAILED", err);
  }
};

runTests();
