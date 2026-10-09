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

const createCategoryValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isString()
    .withMessage("Category name must be a string")
    .isLength({ max: 100 })
    .withMessage("Category name must not exceed 100 characters"),

  body("description")
    .optional()
    .trim()
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

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

  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),

  handleValidationErrors,
];

const updateCategoryValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category name cannot be empty")
    .isString()
    .withMessage("Category name must be a string")
    .isLength({ max: 100 })
    .withMessage("Category name must not exceed 100 characters"),

  body("description")
    .optional()
    .trim()
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

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

  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  handleValidationErrors,
];

const createProductValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isString()
    .withMessage("Product name must be a string")
    .isLength({ max: 150 })
    .withMessage("Product name must not exceed 150 characters"),

  body("slug")
    .trim()
    .notEmpty()
    .withMessage("Product slug is required")
    .isString()
    .withMessage("Product slug must be a string")
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage("Slug must be lowercase alphanumeric with hyphens (e.g. 'veg-burger')"),

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

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Category must be a valid MongoDB ObjectId"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a number greater than or equal to 0"),

  body("stock")
    .notEmpty()
    .withMessage("Stock is required")
    .isInt({ min: 0 })
    .withMessage("Stock must be an integer greater than or equal to 0"),

  body("lowStockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Low stock threshold must be a non-negative integer"),

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

const updateProductValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Product name cannot be empty")
    .isString()
    .withMessage("Product name must be a string")
    .isLength({ max: 150 })
    .withMessage("Product name must not exceed 150 characters"),

  body("slug")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Product slug cannot be empty")
    .isString()
    .withMessage("Product slug must be a string")
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage("Slug must be lowercase alphanumeric with hyphens"),

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

  body("category")
    .optional()
    .isMongoId()
    .withMessage("Category must be a valid MongoDB ObjectId"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a number greater than or equal to 0"),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be an integer greater than or equal to 0"),

  body("lowStockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Low stock threshold must be a non-negative integer"),

  body("preparationTime")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Preparation time must be a non-negative number"),

  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable must be a boolean"),

  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),

  handleValidationErrors,
];

module.exports = {
  createCategoryValidator,
  updateCategoryValidator,
  createProductValidator,
  updateProductValidator,
};
