const path = require("path");
const fs = require("fs");
const multer = require("multer");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// Memory storage keeps files in RAM buffer to prevent uncleaned disk artifacts
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(mime)) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Only valid image files (JPEG, PNG, WebP) are allowed"
      )
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

/**
 * Validates actual binary content (magic bytes/signature) of image buffer.
 * Supports JPEG, PNG, and WebP.
 *
 * @param {Buffer} buffer
 * @returns {string|null} Detected MIME type or null if unrecognized
 */
const detectImageSignature = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG magic bytes: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP magic bytes: 'RIFF' at 0..3 and 'WEBP' at 8..11
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return "image/webp";
  }

  return null;
};

/**
 * Cleanup helper if a disk file was created
 */
const cleanupFile = (file) => {
  if (file && file.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (_) {
      // Ignore cleanup error
    }
  }
};

/**
 * Express middleware for single image upload with strict validation:
 * - Accepts field name 'image' or 'file'
 * - Enforces 5 MB size limit
 * - Validates filename extension, MIME header, and actual magic bytes in buffer
 */
const uploadSingleImage = (req, res, next) => {
  // Allow 'image' or 'file' form field
  const uploadHandler = upload.fields([
    { name: "image", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]);

  uploadHandler(req, res, (err) => {
    // Attach cleanup on response finish if disk path exists
    res.on("finish", () => {
      cleanupFile(req.file);
    });

    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File size exceeds the 5 MB limit",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "File upload validation failed",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }

    // Resolve file from either 'image' or 'file' field
    const uploadedFile =
      (req.files && req.files.image && req.files.image[0]) ||
      (req.files && req.files.file && req.files.file[0]) ||
      req.file;

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: "No image file provided. Please attach an image file using 'image' or 'file' field.",
      });
    }

    req.file = uploadedFile;

    // Validate actual binary content (magic numbers)
    const detectedType = detectImageSignature(req.file.buffer);
    if (!detectedType) {
      cleanupFile(req.file);
      return res.status(400).json({
        success: false,
        message:
          "Invalid file content. File signature does not match supported image types (JPEG, PNG, WebP).",
      });
    }

    req.file.detectedMimeType = detectedType;
    next();
  });
};

module.exports = {
  uploadSingleImage,
  detectImageSignature,
  cleanupFile,
  MAX_FILE_SIZE,
};
