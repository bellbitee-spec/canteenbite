const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const orderController = require("../controllers/orderController");
const {
  createOrderValidator,
  getOrderByIdValidator,
  cancelOrderValidator,
} = require("../validators/orderValidators");

// POST /api/orders - Create a new order (authoritative, atomic)
router.post(
  "/",
  authMiddleware,
  createOrderValidator,
  orderController.createOrder
);

// GET /api/orders - Get current user's order history
router.get(
  "/",
  authMiddleware,
  orderController.getMyOrders
);

// GET /api/orders/:id - Get specific order by ID (user-isolated)
router.get(
  "/:id",
  authMiddleware,
  getOrderByIdValidator,
  orderController.getOrderById
);

// POST /api/orders/:id/cancel - Cancel an order within 30-second window
router.post(
  "/:id/cancel",
  authMiddleware,
  cancelOrderValidator,
  orderController.cancelOrder
);

module.exports = router;
