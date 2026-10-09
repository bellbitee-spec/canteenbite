const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const nosqlSanitizer = require("./middleware/sanitizeMiddleware");
const { apiLimiter } = require("./middleware/rateLimitMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const comboRoutes = require("./routes/comboRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const storeRoutes = require("./routes/storeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

// HTTP Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Cross-Origin Resource Sharing
const configuredOrigins = (
  env.ALLOWED_ORIGINS || [
    env.CLIENT_URL || "https://canteenbite.pages.dev",
    env.ADMIN_URL || "https://canteenbite-admin.pages.dev",
  ].filter(Boolean)
).map((o) => o.replace(/\/+$/, ""));

const devOrigins =
  env.NODE_ENV !== "production"
    ? [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
      ]
    : [];
const allowedOrigins = Array.from(new Set([...configuredOrigins, ...devOrigins]));

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Allow requests with no origin (e.g. mobile apps, curl, tests)
  const cleanOrigin = origin.trim().replace(/\/+$/, "");
  if (allowedOrigins.includes(cleanOrigin)) {
    return true;
  }
  // Support Cloudflare Pages branch / commit previews for this application
  if (/^https:\/\/([a-z0-9-]+\.)?canteenbite\.pages\.dev$/.test(cleanOrigin)) {
    return true;
  }
  if (/^https:\/\/([a-z0-9-]+\.)?canteenbite-admin\.pages\.dev$/.test(cleanOrigin)) {
    return true;
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(
        new Error("CORS policy violation: Access forbidden from this origin.")
      );
    },
    credentials: true,
  })
);

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// NoSQL Injection Sanitization
app.use(nosqlSanitizer);

// General API Rate Limiting
app.use("/api", apiLimiter);

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Canteen API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/combos", comboRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Production-hardened Centralized Error Handler
app.use(errorMiddleware);

module.exports = app;
