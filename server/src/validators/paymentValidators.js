const { body, param, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

const createOrderPaymentValidator = [
  body("orderId")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Order ID must be a valid MongoDB ObjectId"),
  handleValidationErrors,
];

const verifyPaymentValidator = [
  body("orderId")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Order ID must be a valid MongoDB ObjectId"),
  body("razorpayPaymentId")
    .trim()
    .notEmpty()
    .withMessage("Razorpay Payment ID is required"),
  body("razorpayOrderId")
    .trim()
    .notEmpty()
    .withMessage("Razorpay Order ID is required"),
  body("razorpaySignature")
    .trim()
    .notEmpty()
    .withMessage("Razorpay Signature is required"),
  handleValidationErrors,
];

const orderIdParamValidator = [
  param("orderId")
    .notEmpty()
    .withMessage("Order ID parameter is required")
    .isMongoId()
    .withMessage("Order ID must be a valid MongoDB ObjectId"),
  handleValidationErrors,
];

const reportFailureValidator = [
  body("orderId")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Order ID must be a valid MongoDB ObjectId"),
  body("reason")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must be 500 characters or fewer"),
  body("attemptedPaymentId")
    .optional()
    .isString()
    .trim(),
  handleValidationErrors,
];

module.exports = {
  createOrderPaymentValidator,
  verifyPaymentValidator,
  orderIdParamValidator,
  reportFailureValidator,
};
