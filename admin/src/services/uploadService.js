import api from "./api";

/**
 * Admin Upload Service for Cloudinary image uploads
 */
const uploadService = {
  /**
   * Upload an image file to Cloudinary via authenticated backend API.
   *
   * @param {File|Blob} file - The image file to upload
   * @param {string} folder - 'products', 'categories', or 'combos'
   * @returns {Promise<{ url: string, public_id?: string }>}
   */
  uploadImage: async (file, folder = "products") => {
    const formData = new FormData();
    formData.append("image", file);
    if (folder) {
      formData.append("folder", folder);
    }

    const response = await api.post("/admin/upload", formData);

    const data = response?.data || response;
    const url = data?.secure_url || data?.url || response?.url;

    if (!url) {
      throw new Error(
        response?.message || "Upload completed but no image URL was returned"
      );
    }

    return {
      url,
      public_id: data?.public_id || response?.public_id,
    };
  },
};

export default uploadService;
