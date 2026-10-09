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

const normalizeScheduleEntries = (req, res, next) => {
  if (Array.isArray(req.body)) {
    req.body = { entries: req.body };
  }
  next();
};

const updateScheduleValidator = [
  normalizeScheduleEntries,
  body("entries")
    .isArray({ min: 1, max: 7 })
    .withMessage("Schedule must provide an array of between 1 and 7 entries"),
  body("entries.*.dayOfWeek")
    .isInt({ min: 0, max: 6 })
    .withMessage("dayOfWeek must be an integer between 0 and 6"),
  body("entries.*.isOpen")
    .isBoolean()
    .withMessage("isOpen must be a boolean"),
  body("entries.*.openingTime")
    .optional({ checkFalsy: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("openingTime must be in HH:mm format (00:00 - 23:59)"),
  body("entries.*.closingTime")
    .optional({ checkFalsy: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("closingTime must be in HH:mm format (00:00 - 23:59)"),
  body("entries").custom((entries) => {
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (entry.isOpen) {
          if (!entry.openingTime || !entry.closingTime) {
            throw new Error(
              `openingTime and closingTime are required when day ${entry.dayOfWeek} is open`
            );
          }
          if (entry.openingTime >= entry.closingTime) {
            throw new Error(
              `closingTime (${entry.closingTime}) must be later than openingTime (${entry.openingTime})`
            );
          }
        }
      }
    }
    return true;
  }),
  handleValidationErrors,
];

const updateSettingsValidator = [
  body("storeName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Store name cannot be empty")
    .isString()
    .withMessage("Store name must be a string")
    .isLength({ max: 100 })
    .withMessage("Store name must not exceed 100 characters"),

  body("isOpen")
    .optional()
    .isBoolean()
    .withMessage("isOpen must be a boolean"),

  body("manualOverride")
    .optional()
    .isBoolean()
    .withMessage("manualOverride must be a boolean"),

  body("acceptingOrders")
    .optional()
    .isBoolean()
    .withMessage("acceptingOrders must be a boolean"),

  body("defaultPreparationTime")
    .optional()
    .isInt({ min: 0 })
    .withMessage("defaultPreparationTime must be an integer greater than or equal to 0"),

  body("currency")
    .optional()
    .trim()
    .isString()
    .withMessage("Currency must be a string")
    .isLength({ min: 1, max: 10 })
    .withMessage("Currency must be between 1 and 10 characters"),

  body("cancellationWindowSeconds")
    .optional()
    .isInt({ min: 1 })
    .withMessage("cancellationWindowSeconds must be an integer greater than or equal to 1"),

  body("temporaryClosedReason")
    .optional()
    .isString()
    .withMessage("temporaryClosedReason must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("temporaryClosedReason must not exceed 500 characters"),

  handleValidationErrors,
];

module.exports = {
  updateScheduleValidator,
  updateSettingsValidator,
};
