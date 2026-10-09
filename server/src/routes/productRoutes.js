const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  createProductValidator,
  updateProductValidator,
} = require("../validators/productValidators");

// Public
router.get("/", productController.getProducts);
router.get("/category/:categoryId", productController.getProductsByCategory);
router.get("/:id", productController.getProductById);

// Admin
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  createProductValidator,
  productController.createProduct
);

router.patch(
  "/:id",
  authMiddleware,
  adminMiddleware,
  updateProductValidator,
  productController.updateProduct
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  productController.deleteProduct
);

module.exports = router;
