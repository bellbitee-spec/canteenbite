const cloudinaryConfig = require("../config/cloudinary");
const { cleanupFile } = require("../middleware/uploadMiddleware");

/**
 * Normalizes and whitelists Cloudinary destination folders
 */
const sanitizeFolder = (folderParam) => {
  if (!folderParam || typeof folderParam !== "string") {
    return "bellbite/products";
  }

  const clean = folderParam.trim().toLowerCase();
  const folderMap = {
    products: "bellbite/products",
    product: "bellbite/products",
    "bellbite/products": "bellbite/products",
    categories: "bellbite/categories",
    category: "bellbite/categories",
    "bellbite/categories": "bellbite/categories",
    combos: "bellbite/combos",
    combo: "bellbite/combos",
    "bellbite/combos": "bellbite/combos",
  };

  if (folderMap[clean]) {
    return folderMap[clean];
  }

  if (/^bellbite\/[a-z0-9_-]+$/.test(clean)) {
    return clean;
  }

  return "bellbite/products";
};

/**
 * Upload an image to Cloudinary.
 * Restricted to ADMIN and SUPER_ADMIN via route middlewares.
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    // Validate that Cloudinary environment variables are configured
    try {
      cloudinaryConfig.validateCloudinaryEnv();
    } catch (envError) {
      cleanupFile(req.file);
      return res.status(500).json({
        success: false,
        message:
          "Image upload service is not configured. Please verify Cloudinary environment credentials.",
      });
    }

    const folder = sanitizeFolder(req.body.folder || req.query.folder);

    const uploadResult = await cloudinaryConfig.uploadStream(req.file.buffer, {
      folder,
      resource_type: "image",
    });

    // Clean up any temp file if disk storage was involved
    cleanupFile(req.file);

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        url: uploadResult.secure_url,
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
      },
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    });
  } catch (error) {
    cleanupFile(req.file);
    return res.status(500).json({
      success: false,
      message: error.message
        ? `Cloudinary upload failed: ${error.message}`
        : "Image upload failed",
    });
  }
};

module.exports = {
  uploadImage,
  sanitizeFolder,
};
