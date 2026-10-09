const express = require("express");
const router = express.Router();
const comboController = require("../controllers/comboController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  createComboValidator,
  updateComboValidator,
} = require("../validators/comboValidators");

// Public routes
router.get("/", comboController.getCombos);
router.get("/:id", comboController.getComboById);

// Admin routes
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  createComboValidator,
  comboController.createCombo
);

router.patch(
  "/:id",
  authMiddleware,
  adminMiddleware,
  updateComboValidator,
  comboController.updateCombo
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  comboController.deleteCombo
);

module.exports = router;
