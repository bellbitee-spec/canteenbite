const { body, validationResult } = require("express-validator");

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

const isValidSafeImage = (value) => {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed === "") return true;
  const isHttpUrl = /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed);
  const isRelative = /^\/[a-zA-Z0-9_\-./%]+$/i.test(trimmed);
  return isHttpUrl || isRelative;
};

const createComboValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Combo name is required")
    .isString()
    .withMessage("Combo name must be a string")
    .isLength({ max: 150 })
    .withMessage("Combo name must not exceed 150 characters"),

  body("description")
    .optional()
    .trim()
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters"),

  body("image")
    .optional()
    .isString()
    .withMessage("Image must be a string")
    .custom((val) => {
      if (!isValidSafeImage(val)) {
        throw new Error("Image must be a valid HTTP/HTTPS URL or safe relative path");
      }
      return true;
    }),

  body("items")
    .isArray({ min: 1 })
    .withMessage("Items must be a non-empty array with at least one product"),

  body("items.*.product")
    .notEmpty()
    .withMessage("Product ID is required for each combo item")
    .isMongoId()
    .withMessage("Product must be a valid MongoDB ObjectId"),

  body("items.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required for each combo item")
    .isInt({ min: 1 })
    .withMessage("Quantity must be an integer greater than or equal to 1"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a number greater than or equal to 0"),

  body("preparationTime")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Preparation time must be a non-negative number"),

  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),

  handleValidationErrors,
];

const updateComboValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Combo name cannot be empty")
    .isString()
    .withMessage("Combo name must be a string")
    .isLength({ max: 150 })
    .withMessage("Combo name must not exceed 150 characters"),

  body("description")
    .optional()
    .trim()
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters"),

  body("image")
    .optional()
    .isString()
    .withMessage("Image must be a string")
    .custom((val) => {
      if (!isValidSafeImage(val)) {
        throw new Error("Image must be a valid HTTP/HTTPS URL or safe relative path");
      }
      return true;
    }),

  body("items")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Items must be a non-empty array with at least one product"),

  body("items.*.product")
    .optional()
    .isMongoId()
    .withMessage("Product must be a valid MongoDB ObjectId"),

  body("items.*.quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be an integer greater than or equal to 1"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a number greater than or equal to 0"),

  body("preparationTime")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Preparation time must be a non-negative number"),

  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),

  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable must be a boolean"),

  handleValidationErrors,
];

module.exports = {
  createComboValidator,
  updateComboValidator,
};
