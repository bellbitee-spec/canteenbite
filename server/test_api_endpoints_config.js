// Verification test for API endpoint and CORS configuration
const assert = require("assert");

console.log("\n=======================================================");
console.log("   BELLBITE PRODUCTION API CONFIGURATION VERIFICATION");
console.log("=======================================================\n");

// 1. Test Base URL resolution logic
const resolveApiBaseUrl = (envUrl, isProd) => {
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
  if (isProd) {
    return "https://canteenbite.onrender.com/api";
  }
  return "http://localhost:5000/api";
};

const resolveSocketUrl = (envSocketUrl, envApiUrl, isProd) => {
  if (envSocketUrl && typeof envSocketUrl === "string" && envSocketUrl.trim()) {
    return envSocketUrl.trim().replace(/\/+$/, "");
  }
  if (envApiUrl && typeof envApiUrl === "string" && envApiUrl.trim()) {
    return envApiUrl.trim().replace(/\/+$/, "").replace(/\/api\/?$/, "");
  }
  if (isProd) {
    return "https://canteenbite.onrender.com";
  }
  return "http://localhost:5000";
};

const formatUrl = (baseUrl, endpoint) => {
  let cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  if (cleanEndpoint.startsWith("api/")) {
    cleanEndpoint = cleanEndpoint.slice(4);
  }
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}/${cleanEndpoint}`;
};

// Assertions
// Case 1: Prod with no env var
assert.strictEqual(
  resolveApiBaseUrl(undefined, true),
  "https://canteenbite.onrender.com/api",
  "Prod default should be onrender.com/api"
);
console.log("✔ [TEST 1] Production default falls back to https://canteenbite.onrender.com/api");

// Case 2: Dev with no env var
assert.strictEqual(
  resolveApiBaseUrl(undefined, false),
  "http://localhost:5000/api",
  "Dev default should be localhost:5000/api"
);
console.log("✔ [TEST 2] Local development falls back to http://localhost:5000/api");

// Case 3: Env var without /api
assert.strictEqual(
  resolveApiBaseUrl("https://canteenbite.onrender.com", true),
  "https://canteenbite.onrender.com/api",
  "Should automatically append /api when omitted"
);
console.log("✔ [TEST 3] Missing /api in env variable is safely appended");

// Case 4: Env var with /api and trailing slashes
assert.strictEqual(
  resolveApiBaseUrl("https://canteenbite.onrender.com/api///", true),
  "https://canteenbite.onrender.com/api",
  "Should normalize trailing slashes"
);
console.log("✔ [TEST 4] Trailing slashes are cleanly sanitized");

// Case 5: Endpoint path construction never generates duplicate /api/api
const base = "https://canteenbite.onrender.com/api";
assert.strictEqual(formatUrl(base, "products"), "https://canteenbite.onrender.com/api/products");
assert.strictEqual(formatUrl(base, "/products"), "https://canteenbite.onrender.com/api/products");
assert.strictEqual(formatUrl(base, "/api/products"), "https://canteenbite.onrender.com/api/products");
assert.strictEqual(formatUrl(base, "api/products"), "https://canteenbite.onrender.com/api/products");
console.log("✔ [TEST 5] URL path construction never creates duplicate /api/api");

// Case 6: Socket URL derivation
assert.strictEqual(resolveSocketUrl(undefined, undefined, true), "https://canteenbite.onrender.com");
assert.strictEqual(resolveSocketUrl(undefined, "https://canteenbite.onrender.com/api", true), "https://canteenbite.onrender.com");
assert.strictEqual(resolveSocketUrl("https://canteenbite.onrender.com/", undefined, true), "https://canteenbite.onrender.com");
console.log("✔ [TEST 6] Socket.IO URL correctly connects to origin root without /api suffix");

// 7. Verify backend CORS configuration
const app = require("./src/app");
const http = require("http");
const server = http.createServer(app);

server.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Test CORS from Student Frontend
    const studentPreflight = await fetch(`${baseUrl}/api/products`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://canteenbite.pages.dev",
        "Access-Control-Request-Method": "GET",
      },
    });
    assert.strictEqual(
      studentPreflight.headers.get("access-control-allow-origin"),
      "https://canteenbite.pages.dev",
      "Student origin should be allowed"
    );
    console.log("✔ [TEST 7] Student frontend origin (https://canteenbite.pages.dev) allowed in CORS");

    // Test CORS from Admin Frontend
    const adminPreflight = await fetch(`${baseUrl}/api/products`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://canteenbite-admin.pages.dev",
        "Access-Control-Request-Method": "GET",
      },
    });
    assert.strictEqual(
      adminPreflight.headers.get("access-control-allow-origin"),
      "https://canteenbite-admin.pages.dev",
      "Admin origin should be allowed"
    );
    console.log("✔ [TEST 8] Admin frontend origin (https://canteenbite-admin.pages.dev) allowed in CORS");

    // Test CORS from Cloudflare preview branch
    const previewPreflight = await fetch(`${baseUrl}/api/products`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://preview-branch.canteenbite.pages.dev",
        "Access-Control-Request-Method": "GET",
      },
    });
    assert.strictEqual(
      previewPreflight.headers.get("access-control-allow-origin"),
      "https://preview-branch.canteenbite.pages.dev",
      "Preview branch should be allowed"
    );
    console.log("✔ [TEST 9] Cloudflare Pages preview subdomain allowed in CORS");

    // Test unauthorized origin is rejected
    const badOriginPreflight = await fetch(`${baseUrl}/api/products`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://malicious-site.com",
        "Access-Control-Request-Method": "GET",
      },
    });
    assert.notStrictEqual(
      badOriginPreflight.headers.get("access-control-allow-origin"),
      "https://malicious-site.com",
      "Malicious origin must not be allowed"
    );
    console.log("✔ [TEST 10] Unauthorized origin strictly forbidden by CORS policy");

    console.log("\nALL 10 CHECKS PASSED SUCCESSFULLY!\n");
  } catch (err) {
    console.error("Verification failed:", err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
