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

const createOrderValidator = [
  body("items")
    .isArray({ min: 1, max: 50 })
    .withMessage("Items must be an array containing between 1 and 50 items"),

  body("items.*.itemType")
    .notEmpty()
    .withMessage("Item type is required")
    .isIn(["PRODUCT", "COMBO"])
    .withMessage("Item type must be either PRODUCT or COMBO"),

  body("items.*.id")
    .notEmpty()
    .withMessage("Item ID is required")
    .isMongoId()
    .withMessage("Item ID must be a valid MongoDB ObjectId"),

  body("items.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1, max: 50 })
    .withMessage("Quantity must be an integer between 1 and 50"),

  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["CASH", "COD", "ONLINE"])
    .withMessage("Payment method must be CASH, COD, or ONLINE"),

  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes must not exceed 500 characters"),

  body("idempotencyKey")
    .optional()
    .isString()
    .withMessage("Idempotency key must be a string")
    .trim()
    .isLength({ max: 128 })
    .withMessage("Idempotency key must not exceed 128 characters"),

  handleValidationErrors,
];

const getOrderByIdValidator = [
  param("id")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Order ID must be a valid MongoDB ObjectId"),

  handleValidationErrors,
];

const cancelOrderValidator = [
  param("id")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Order ID must be a valid MongoDB ObjectId"),

  body("reason")
    .optional()
    .isString()
    .withMessage("Reason must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must not exceed 500 characters"),

  handleValidationErrors,
];

const updateOrderStatusValidator = [
  param("id")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Order ID must be a valid MongoDB ObjectId"),

  body("status")
    .trim()
    .notEmpty()
    .withMessage("Order status is required")
    .isString()
    .withMessage("Order status must be a string")
    .toUpperCase()
    .isIn(["CONFIRMED", "PREPARING", "READY", "COMPLETED", "DELAYED"])
    .withMessage("Invalid status. Allowed values: CONFIRMED, PREPARING, READY, COMPLETED, DELAYED"),

  handleValidationErrors,
];

const adminCancelOrderValidator = [
  param("id")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Order ID must be a valid MongoDB ObjectId"),

  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Cancellation reason is required.")
    .isString()
    .withMessage("Cancellation reason must be a string")
    .isLength({ min: 1, max: 500 })
    .withMessage("Cancellation reason must be between 1 and 500 characters"),

  handleValidationErrors,
];

module.exports = {
  createOrderValidator,
  getOrderByIdValidator,
  cancelOrderValidator,
  updateOrderStatusValidator,
  adminCancelOrderValidator,
};

