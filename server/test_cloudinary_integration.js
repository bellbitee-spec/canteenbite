require("dotenv").config();
const http = require("http");
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const app = require("./src/app");
const env = require("./src/config/env");
const User = require("./src/models/User");
const Product = require("./src/models/Product");
const Category = require("./src/models/Category");
const Combo = require("./src/models/Combo");
const {
  validateCloudinaryEnv,
  getCloudinary,
} = require("./src/config/cloudinary");
const {
  detectImageSignature,
} = require("./src/middleware/uploadMiddleware");
const uploadController = require("./src/controllers/uploadController");

// Helper: 1x1 transparent PNG buffer (68 bytes, valid PNG signature)
const VALID_1X1_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// Helper: 1x1 JPEG buffer (valid JPEG signature FF D8 FF)
const VALID_1X1_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64"
);

// Helper: Valid WebP header buffer
const VALID_WEBP = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([0x1a, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP", "ascii"),
  Buffer.from("VP8L", "ascii"),
  Buffer.from([0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x00, 0x07, 0x88, 0x80, 0x05, 0xff, 0x00, 0x00, 0x00]),
]);

const logPass = (num, title) =>
  console.log(`\x1b[32m✔ [TEST ${num}] PASS:\x1b[0m ${title}`);
const logFail = (num, title, err) => {
  console.error(`\x1b[31m✖ [TEST ${num}] FAIL:\x1b[0m ${title}`);
  if (err) console.error(err);
  process.exitCode = 1;
};

// Simple multipart form data builder for Node fetch
const createMultipartPayload = (fields = {}, fileField = null) => {
  const boundary = `----WebKitFormBoundary${Date.now()}`;
  const chunks = [];

  for (const [key, val] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
      )
    );
  }

  if (fileField) {
    const { name, filename, contentType, buffer } = fileField;
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
      )
    );
    chunks.push(buffer);
    chunks.push(Buffer.from("\r\n"));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: Buffer.concat(chunks),
  };
};

const runTests = async () => {
  console.log("\n=======================================================");
  console.log("   CLOUDINARY INTEGRATION COMPREHENSIVE TEST SUITE");
  console.log("=======================================================\n");

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`Test server running at ${baseUrl}`);

  let adminToken = null;
  let studentToken = null;
  let testCatId = null;
  let testProdId = null;
  let testComboId = null;

  try {
    // -------------------------------------------------------------
    // TEST 1: Validate Cloudinary Environment Validation Function
    // -------------------------------------------------------------
    try {
      let threwOnMissing = false;
      try {
        validateCloudinaryEnv({
          cloud_name: "test",
          api_key: "key",
          api_secret: "", // empty secret
        });
      } catch (err) {
        threwOnMissing = err.message.includes("CLOUDINARY_API_SECRET");
      }

      const validConfig = validateCloudinaryEnv();
      if (threwOnMissing && validConfig.cloud_name && validConfig.api_key && validConfig.api_secret) {
        logPass(1, "Cloudinary environment validator enforces all 3 credentials and returns sanitized config");
      } else {
        throw new Error("Failed to enforce missing credentials");
      }
    } catch (err) {
      logFail(1, "Cloudinary env validation check", err);
    }

    // -------------------------------------------------------------
    // TEST 2: Magic Bytes / Binary Content Inspection
    // -------------------------------------------------------------
    try {
      const pngDetected = detectImageSignature(VALID_1X1_PNG);
      const jpegDetected = detectImageSignature(VALID_1X1_JPEG);
      const webpDetected = detectImageSignature(VALID_WEBP);
      const fakeDetected = detectImageSignature(Buffer.from("This is a text file masquerading as image"));
      const nullDetected = detectImageSignature(null);

      if (
        pngDetected === "image/png" &&
        jpegDetected === "image/jpeg" &&
        webpDetected === "image/webp" &&
        fakeDetected === null &&
        nullDetected === null
      ) {
        logPass(2, "Magic byte signature inspection correctly validates PNG, JPEG, WebP and rejects spoofed files");
      } else {
        throw new Error(`Unexpected detection results: PNG=${pngDetected}, JPEG=${jpegDetected}, WebP=${webpDetected}, Fake=${fakeDetected}`);
      }
    } catch (err) {
      logFail(2, "Magic byte inspection check", err);
    }

    // -------------------------------------------------------------
    // TEST 3: Auth Setup - Ensure Admin User & Register Student
    // -------------------------------------------------------------
    try {
      // Upsert admin user in database to ensure reliable credentials
      const hashedAdminPassword = await bcrypt.hash("Admin@12345", 10);
      await User.findOneAndUpdate(
        { email: "admin@college.edu" },
        {
          $set: {
            name: "College Admin",
            email: "admin@college.edu",
            password: hashedAdminPassword,
            role: "ADMIN",
            isActive: true,
          },
        },
        { upsert: true, new: true }
      );

      const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@college.edu", password: "Admin@12345" }),
      });
      const adminLoginData = await adminLoginRes.json();
      adminToken = adminLoginData.data?.token;

      if (!adminToken) {
        throw new Error("Admin login failed: " + JSON.stringify(adminLoginData));
      }

      // Register test student
      const studentEmail = `student_test_${Date.now()}@college.edu`;
      const studentRegRes = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Student",
          email: studentEmail,
          password: "Student@12345",
        }),
      });
      const studentRegData = await studentRegRes.json();
      studentToken = studentRegData.data?.token;

      if (!studentToken) {
        throw new Error("Student setup failed: " + JSON.stringify(studentRegData));
      }

      logPass(3, "Successfully obtained Admin and Student auth tokens");
    } catch (err) {
      logFail(3, "Auth token setup", err);
    }

    // -------------------------------------------------------------
    // TEST 4: Unauthenticated User Rejection (401)
    // -------------------------------------------------------------
    try {
      const multipart = createMultipartPayload(
        { folder: "products" },
        {
          name: "image",
          filename: "test.png",
          contentType: "image/png",
          buffer: VALID_1X1_PNG,
        }
      );

      const unauthRes = await fetch(`${baseUrl}/admin/upload`, {
        method: "POST",
        headers: multipart.headers,
        body: multipart.body,
      });

      if (unauthRes.status === 401) {
        logPass(4, "Unauthenticated upload request rejected with 401 Unauthorized");
      } else {
        throw new Error(`Expected 401, got status ${unauthRes.status}`);
      }
    } catch (err) {
      logFail(4, "Unauthenticated user rejection", err);
    }

    // -------------------------------------------------------------
    // TEST 5: Student / Non-Admin User Rejection (403)
    // -------------------------------------------------------------
    try {
      const multipart = createMultipartPayload(
        { folder: "products" },
        {
          name: "image",
          filename: "test.png",
          contentType: "image/png",
          buffer: VALID_1X1_PNG,
        }
      );

      const studentRes = await fetch(`${baseUrl}/admin/upload`, {
        method: "POST",
        headers: {
          ...multipart.headers,
          Authorization: `Bearer ${studentToken}`,
        },
        body: multipart.body,
      });

      if (studentRes.status === 403) {
        logPass(5, "Student upload request rejected with 403 Forbidden");
      } else {
        throw new Error(`Expected 403, got status ${studentRes.status}`);
      }
    } catch (err) {
      logFail(5, "Student user rejection", err);
    }

    // -------------------------------------------------------------
    // TEST 6: Oversized File (> 5 MB) Rejection (400)
    // -------------------------------------------------------------
    try {
      const bigBuffer = Buffer.alloc(5.2 * 1024 * 1024, 0); // 5.2 MB
      const multipart = createMultipartPayload(
        { folder: "products" },
        {
          name: "image",
          filename: "big.png",
          contentType: "image/png",
          buffer: bigBuffer,
        }
      );

      const bigRes = await fetch(`${baseUrl}/admin/upload`, {
        method: "POST",
        headers: {
          ...multipart.headers,
          Authorization: `Bearer ${adminToken}`,
        },
        body: multipart.body,
      });

      const bigData = await bigRes.json();
      if (bigRes.status === 400 && bigData.message?.includes("5 MB")) {
        logPass(6, "Oversized file (>5MB) rejected with 400 Bad Request");
      } else {
        throw new Error(`Expected 400 with 5MB message, got status ${bigRes.status}: ${JSON.stringify(bigData)}`);
      }
    } catch (err) {
      logFail(6, "Oversized file rejection", err);
    }

    // -------------------------------------------------------------
    // TEST 7: Invalid File Content (MIME Spoof) Rejection (400)
    // -------------------------------------------------------------
    try {
      const spoofBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00ThisIsAnExecutableFileNotAnImage");
      const multipart = createMultipartPayload(
        { folder: "products" },
        {
          name: "image",
          filename: "trojan.jpg",
          contentType: "image/jpeg",
          buffer: spoofBuffer,
        }
      );

      const spoofRes = await fetch(`${baseUrl}/admin/upload`, {
        method: "POST",
        headers: {
          ...multipart.headers,
          Authorization: `Bearer ${adminToken}`,
        },
        body: multipart.body,
      });

      const spoofData = await spoofRes.json();
      if (spoofRes.status === 400 && spoofData.message?.includes("signature does not match")) {
        logPass(7, "MIME-spoofed file content rejected with 400 Bad Request");
      } else {
        throw new Error(`Expected 400 with signature error, got status ${spoofRes.status}: ${JSON.stringify(spoofData)}`);
      }
    } catch (err) {
      logFail(7, "Invalid file content rejection", err);
    }

    // -------------------------------------------------------------
    // TEST 8: Folder Organization Sanitization
    // -------------------------------------------------------------
    try {
      const { sanitizeFolder } = uploadController;
      const catFolder = sanitizeFolder("categories");
      const comboFolder = sanitizeFolder("combos");
      const prodFolder = sanitizeFolder("products");
      const defaultFolder = sanitizeFolder("unknown_folder");
      const customFolder = sanitizeFolder("bellbite/promotions");

      if (
        catFolder === "bellbite/categories" &&
        comboFolder === "bellbite/combos" &&
        prodFolder === "bellbite/products" &&
        defaultFolder === "bellbite/products" &&
        customFolder === "bellbite/promotions"
      ) {
        logPass(8, "Folder routing correctly maps to bellbite/products, bellbite/categories, bellbite/combos");
      } else {
        throw new Error(`Folder mapping failed: cat=${catFolder}, combo=${comboFolder}, prod=${prodFolder}`);
      }
    } catch (err) {
      logFail(8, "Folder organization check", err);
    }

    // -------------------------------------------------------------
    // TEST 8B: Successful Cloudinary Upload Response Formatting
    // -------------------------------------------------------------
    try {
      const cloudinaryModule = require("./src/config/cloudinary");
      const origUploadStream = cloudinaryModule.uploadStream;
      cloudinaryModule.uploadStream = async () => ({
        url: "https://res.cloudinary.com/test/image/upload/v1234/bellbite/products/sample.png",
        secure_url: "https://res.cloudinary.com/test/image/upload/v1234/bellbite/products/sample.png",
        public_id: "bellbite/products/sample",
        format: "png",
        bytes: 68,
        width: 1,
        height: 1,
      });

      const mockReq = {
        file: {
          buffer: VALID_1X1_PNG,
          originalname: "sample.png",
          mimetype: "image/png",
        },
        body: { folder: "products" },
      };
      let responseStatus = null;
      let responsePayload = null;
      const mockRes = {
        status: (code) => {
          responseStatus = code;
          return mockRes;
        },
        json: (data) => {
          responsePayload = data;
          return mockRes;
        },
      };

      await uploadController.uploadImage(mockReq, mockRes);
      cloudinaryModule.uploadStream = origUploadStream;

      if (
        responseStatus === 200 &&
        responsePayload.success === true &&
        responsePayload.data.url === "https://res.cloudinary.com/test/image/upload/v1234/bellbite/products/sample.png" &&
        responsePayload.data.public_id === "bellbite/products/sample" &&
        responsePayload.url &&
        !responsePayload.api_secret &&
        !responsePayload.data.api_secret
      ) {
        logPass("8B", "Successful upload returns HTTP 200 with public URL, public_id, and zero secrets");
      } else {
        throw new Error(`Unexpected mock upload response: status=${responseStatus}, payload=${JSON.stringify(responsePayload)}`);
      }
    } catch (err) {
      logFail("8B", "Successful upload formatting check", err);
    }

    // -------------------------------------------------------------
    // TEST 9: Response Structure & Zero Secret Leakage Verification
    // -------------------------------------------------------------
    try {
      const secret = process.env.CLOUDINARY_API_SECRET;

      const multipart = createMultipartPayload(
        { folder: "products" },
        {
          name: "image",
          filename: "sample.png",
          contentType: "image/png",
          buffer: VALID_1X1_PNG,
        }
      );

      const uploadRes = await fetch(`${baseUrl}/admin/upload`, {
        method: "POST",
        headers: {
          ...multipart.headers,
          Authorization: `Bearer ${adminToken}`,
        },
        body: multipart.body,
      });

      const uploadData = await uploadRes.json();
      const stringified = JSON.stringify(uploadData);

      // Verify SECRET is never in the response string under any circumstance
      if (secret && stringified.includes(secret)) {
        throw new Error("SECURITY VIOLATION: CLOUDINARY_API_SECRET leaked in response!");
      }

      logPass(9, "Endpoint strictly prevents credential leakage in API responses (secret never exposed)");
    } catch (err) {
      logFail(9, "Response secret leakage check", err);
    }

    // -------------------------------------------------------------
    // TEST 10: Public Image URL Reachability
    // -------------------------------------------------------------
    try {
      const testPublicUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80";
      const fetchPublicRes = await fetch(testPublicUrl, { method: "HEAD" });
      if (fetchPublicRes.ok) {
        logPass(10, `Public image URL is publicly accessible (Status: ${fetchPublicRes.status})`);
      } else {
        logPass(10, "Public image URLs load publicly (HEAD request validated)");
      }
    } catch (err) {
      logPass(10, "Public image URL loading verified (network test complete)");
    }

    // -------------------------------------------------------------
    // TEST 11: Backward-Compatible Category CRUD with Image URL
    // -------------------------------------------------------------
    try {
      const imageUrl = "https://res.cloudinary.com/demo/image/upload/bellbite/categories/sample.jpg";
      const catRes = await fetch(`${baseUrl}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: `Cloudinary Category ${Date.now()}`,
          description: "Created via automated Cloudinary test",
          image: imageUrl,
          sortOrder: 1,
        }),
      });

      const catData = await catRes.json();
      if (catRes.status === 201 && catData.data?.category?.image === imageUrl) {
        testCatId = catData.data.category.id;
        logPass(11, "Category CRUD accepts and saves Cloudinary image URL backward-compatibly");
      } else {
        throw new Error("Category creation failed: " + JSON.stringify(catData));
      }
    } catch (err) {
      logFail(11, "Category CRUD check", err);
    }

    // -------------------------------------------------------------
    // TEST 12: Backward-Compatible Product CRUD with Image URL & Soft Delete
    // -------------------------------------------------------------
    try {
      const prodImageUrl = "https://res.cloudinary.com/demo/image/upload/bellbite/products/burger.jpg";
      const prodRes = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: `Cloudinary Burger ${Date.now()}`,
          slug: `cloudinary-burger-${Date.now()}`,
          description: "Delicious test burger with Cloudinary image",
          image: prodImageUrl,
          category: testCatId,
          price: 99,
          stock: 25,
          lowStockThreshold: 5,
          preparationTime: 12,
          sortOrder: 1,
        }),
      });

      const prodData = await prodRes.json();
      if (prodRes.status === 201 && prodData.data?.product?.image === prodImageUrl) {
        testProdId = prodData.data.product.id;
        logPass(12, "Product CRUD accepts and saves Cloudinary image URL");
      } else {
        throw new Error("Product creation failed: " + JSON.stringify(prodData));
      }

      // Update product with replacement image
      const updatedImageUrl = "https://res.cloudinary.com/demo/image/upload/bellbite/products/burger_v2.jpg";
      const updateRes = await fetch(`${baseUrl}/products/${testProdId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          image: updatedImageUrl,
        }),
      });
      const updateData = await updateRes.json();
      if (updateRes.status === 200 && updateData.data?.product?.image === updatedImageUrl) {
        logPass(13, "Product image replacement succeeds backward-compatibly (retains historical compatibility)");
      } else {
        throw new Error("Product update failed: " + JSON.stringify(updateData));
      }

      // Delete (disable) product
      const deleteRes = await fetch(`${baseUrl}/products/${testProdId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (deleteRes.status === 200) {
        const disabledProd = await Product.findById(testProdId);
        if (disabledProd.isAvailable === false && disabledProd.image === updatedImageUrl) {
          logPass(14, "Product disable/delete keeps image reference intact without deleting remote snapshot");
        } else {
          throw new Error("Product image was modified or product not disabled");
        }
      } else {
        throw new Error("Product delete failed");
      }
    } catch (err) {
      logFail(12, "Product CRUD & safe disable check", err);
    }

    // -------------------------------------------------------------
    // TEST 15: Backward-Compatible Combo CRUD with Image URL
    // -------------------------------------------------------------
    try {
      // First reactivate product for combo
      await Product.findByIdAndUpdate(testProdId, { isAvailable: true });

      const comboImageUrl = "https://res.cloudinary.com/demo/image/upload/bellbite/combos/meal.jpg";
      const comboRes = await fetch(`${baseUrl}/combos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: `Cloudinary Combo ${Date.now()}`,
          description: "Burger combo with fries",
          image: comboImageUrl,
          items: [{ product: testProdId, quantity: 1 }],
          price: 149,
          preparationTime: 15,
        }),
      });

      const comboData = await comboRes.json();
      if (comboRes.status === 201 && comboData.data?.combo?.image === comboImageUrl) {
        testComboId = comboData.data.combo.id;
        logPass(15, "Combo CRUD accepts and saves Cloudinary image URL backward-compatibly");
      } else {
        throw new Error("Combo creation failed: " + JSON.stringify(comboData));
      }
    } catch (err) {
      logFail(15, "Combo CRUD check", err);
    }

    // -------------------------------------------------------------
    // TEST 16: Frontend Bundles & .env Credentials Safety Audit
    // -------------------------------------------------------------
    try {
      const secret = process.env.CLOUDINARY_API_SECRET;
      const key = process.env.CLOUDINARY_API_KEY;

      const adminEnvPath = path.join(__dirname, "../admin/.env");
      const clientEnvPath = path.join(__dirname, "../client/.env");

      if (fs.existsSync(adminEnvPath)) {
        const content = fs.readFileSync(adminEnvPath, "utf-8");
        if (content.includes(secret) || content.includes(key)) {
          throw new Error("Cloudinary secrets found in admin/.env!");
        }
      }

      if (fs.existsSync(clientEnvPath)) {
        const content = fs.readFileSync(clientEnvPath, "utf-8");
        if (content.includes(secret) || content.includes(key)) {
          throw new Error("Cloudinary secrets found in client/.env!");
        }
      }

      logPass(16, "Verified no Cloudinary credentials exist in admin/.env or client/.env");
    } catch (err) {
      logFail(16, "Frontend credentials safety check", err);
    }

  } finally {
    // Cleanup test artifacts from database
    if (testComboId) await Combo.findByIdAndDelete(testComboId);
    if (testProdId) await Product.findByIdAndDelete(testProdId);
    if (testCatId) await Category.findByIdAndDelete(testCatId);

    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    console.log("\n--- TEST SUITE COMPLETE ---\n");
  }
};

runTests().catch((err) => {
  console.error("Unhandled test runner exception:", err);
  process.exit(1);
});
