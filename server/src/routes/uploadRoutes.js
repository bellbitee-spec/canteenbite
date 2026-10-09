const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { uploadSingleImage } = require("../middleware/uploadMiddleware");
const uploadController = require("../controllers/uploadController");

/**
 * POST /api/upload
 * Authenticated endpoint restricted to ADMIN and SUPER_ADMIN
 */
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  uploadSingleImage,
  uploadController.uploadImage
);

module.exports = router;
