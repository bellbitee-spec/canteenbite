const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { paymentLimiter } = require("../middleware/rateLimitMiddleware");
const paymentController = require("../controllers/paymentController");
const {
  createOrderPaymentValidator,
  verifyPaymentValidator,
  orderIdParamValidator,
  reportFailureValidator,
} = require("../validators/paymentValidators");

// POST /api/payments/create-order (or /create) - Initialize online gateway transaction
router.post(
  "/create-order",
  paymentLimiter,
  authMiddleware,
  createOrderPaymentValidator,
  paymentController.createOrder
);
router.post(
  "/create",
  paymentLimiter,
  authMiddleware,
  createOrderPaymentValidator,
  paymentController.createOrder
);

// POST /api/payments/verify - Cryptographic signature verification
router.post(
  "/verify",
  paymentLimiter,
  authMiddleware,
  verifyPaymentValidator,
  paymentController.verify
);

// POST /api/payments/webhook - Gateway webhook callbacks
router.post(
  "/webhook",
  paymentController.webhook
);

// GET /api/payments/order/:orderId - Fetch payment status for order
router.get(
  "/order/:orderId",
  authMiddleware,
  orderIdParamValidator,
  paymentController.getByOrderId
);

// POST /api/payments/fail (or /report-failure) - Report client-side failure or cancellation
router.post(
  "/fail",
  authMiddleware,
  reportFailureValidator,
  paymentController.reportFailure
);
router.post(
  "/report-failure",
  authMiddleware,
  reportFailureValidator,
  paymentController.reportFailure
);

module.exports = router;
