const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");
const env = require("./env");

/**
 * Validates that all required Cloudinary environment variables are present.
 * Throws an explicit error if any variable is missing.
 */
const validateCloudinaryEnv = (customConfig = null) => {
  const cloud_name =
    customConfig?.cloud_name !== undefined
      ? customConfig.cloud_name
      : (process.env.CLOUDINARY_CLOUD_NAME || env.CLOUDINARY_CLOUD_NAME);
  const api_key =
    customConfig?.api_key !== undefined
      ? customConfig.api_key
      : (process.env.CLOUDINARY_API_KEY || env.CLOUDINARY_API_KEY);
  const api_secret =
    customConfig?.api_secret !== undefined
      ? customConfig.api_secret
      : (process.env.CLOUDINARY_API_SECRET || env.CLOUDINARY_API_SECRET);

  const missing = [];
  if (!cloud_name || !cloud_name.trim()) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!api_key || !api_key.trim()) missing.push("CLOUDINARY_API_KEY");
  if (!api_secret || !api_secret.trim()) missing.push("CLOUDINARY_API_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Cloudinary configuration missing required environment variable(s): ${missing.join(", ")}`
    );
  }

  return {
    cloud_name: cloud_name.trim(),
    api_key: api_key.trim(),
    api_secret: api_secret.trim(),
  };
};

/**
 * Returns a configured Cloudinary instance after validating environment credentials.
 */
const getCloudinary = () => {
  const { cloud_name, api_key, api_secret } = validateCloudinaryEnv();

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });

  return cloudinary;
};

/**
 * Uploads a memory buffer to Cloudinary via upload_stream.
 *
 * @param {Buffer} buffer - File buffer to upload
 * @param {Object} options - Cloudinary upload options (e.g. folder, resource_type)
 * @returns {Promise<Object>} Safe upload result containing only public metadata
 */
const uploadStream = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const cld = getCloudinary();

      const uploadOptions = {
        resource_type: "image",
        ...options,
      };

      const stream = cld.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          return reject(error);
        }

        // Return only safe public metadata; never expose secrets
        resolve({
          url: result.secure_url || result.url,
          secure_url: result.secure_url || result.url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          created_at: result.created_at,
        });
      });

      Readable.from(buffer).pipe(stream);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  cloudinary,
  validateCloudinaryEnv,
  getCloudinary,
  uploadStream,
};
