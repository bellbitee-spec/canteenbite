const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const orderController = require("../controllers/orderController");
const storeController = require("../controllers/storeController");
const uploadController = require("../controllers/uploadController");
const { uploadSingleImage } = require("../middleware/uploadMiddleware");
const {
  getOrderByIdValidator,
  updateOrderStatusValidator,
  adminCancelOrderValidator,
  updatePreparationTimeValidator,
} = require("../validators/orderValidators");
const {
  updateScheduleValidator,
  updateSettingsValidator,
} = require("../validators/storeValidators");

// All admin routes require JWT authentication and ADMIN / SUPER_ADMIN role
router.use(authMiddleware, adminMiddleware);

// --- ORDER MANAGEMENT ROUTES ---

// GET /api/admin/orders/stats - Today's order stats by status (defined before /orders/:id)
router.get("/orders/stats", orderController.getAdminOrderStats);

// GET /api/admin/orders - List orders with filtering, search, and pagination
router.get("/orders", orderController.getAdminOrders);

// GET /api/admin/orders/:id - Detailed order view
router.get(
  "/orders/:id",
  getOrderByIdValidator,
  orderController.getAdminOrderById
);

// PATCH /api/admin/orders/:id/status - Update order lifecycle status
router.patch(
  "/orders/:id/status",
  updateOrderStatusValidator,
  orderController.updateOrderStatus
);

// PATCH /api/admin/orders/:id/preparation-time - Admin adjust estimated preparation time
router.patch(
  "/orders/:id/preparation-time",
  updatePreparationTimeValidator,
  orderController.updatePreparationTime
);

// POST /api/admin/orders/:id/cancel - Admin cancel order with reason
router.post(
  "/orders/:id/cancel",
  adminCancelOrderValidator,
  orderController.adminCancelOrder
);

// PATCH /api/admin/orders/:id/payment - Admin record payment status (e.g. cash collected for COD)
router.patch(
  "/orders/:id/payment",
  getOrderByIdValidator,
  orderController.recordPayment
);

// --- STORE SCHEDULE & SETTINGS MANAGEMENT ROUTES (PART 16) ---

// GET /api/admin/store/status - Get authoritative store status
router.get("/store/status", storeController.getAdminStoreStatus);

// GET /api/admin/store/schedule - Get weekly 7-day schedule
router.get("/store/schedule", storeController.getAdminSchedule);

// PATCH /api/admin/store/schedule - Update weekly schedule entries
router.patch(
  "/store/schedule",
  updateScheduleValidator,
  storeController.updateAdminSchedule
);

// GET /api/admin/store/settings - Get current store configuration settings
router.get("/store/settings", storeController.getAdminSettings);

// PATCH /api/admin/store/settings - Update store configuration settings (manualOverride, isOpen, etc.)
router.patch(
  "/store/settings",
  updateSettingsValidator,
  storeController.updateAdminSettings
);

// --- IMAGE UPLOAD ROUTE ---
// POST /api/admin/upload - Authenticated image upload for products, categories, and combos
router.post("/upload", uploadSingleImage, uploadController.uploadImage);

module.exports = router;
