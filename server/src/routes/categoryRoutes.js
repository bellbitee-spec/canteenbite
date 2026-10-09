const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  createCategoryValidator,
  updateCategoryValidator,
} = require("../validators/productValidators");

// Public
router.get("/", categoryController.getCategories);
router.get("/:id", categoryController.getCategoryById);

// Admin
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  createCategoryValidator,
  categoryController.createCategory
);

router.patch(
  "/:id",
  authMiddleware,
  adminMiddleware,
  updateCategoryValidator,
  categoryController.updateCategory
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  categoryController.deleteCategory
);

module.exports = router;
