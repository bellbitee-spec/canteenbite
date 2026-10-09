const dotenv = require("dotenv");

dotenv.config();

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGODB_URI || process.env.MONGO_URI,
  CLIENT_URL: process.env.CLIENT_URL || "https://canteenbite.pages.dev",
  ADMIN_URL: process.env.ADMIN_URL || "https://canteenbite-admin.pages.dev",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim().replace(/\/+$/, ""))
    : null,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_placeholder",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

if (!env.MONGO_URI) {
  throw new Error("MONGO_URI (or MONGODB_URI) is not defined in environment variables.");
}

module.exports = env;
