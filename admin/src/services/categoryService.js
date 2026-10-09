import api from "./api";

/**
 * Admin Category Service
 * Communicates with backend /api/categories endpoints
 */
const categoryService = {
  /**
   * Fetch categories with optional parameters
   * Endpoint: GET /api/categories
   * Supports includeInactive=true for administrative view
   */
  getCategories: async (params = {}) => {
    const searchParams = new URLSearchParams();

    if (params.includeInactive !== undefined) {
      searchParams.set("includeInactive", String(params.includeInactive));
    } else {
      // Default to includeInactive=true so admin sees both active and inactive categories
      searchParams.set("includeInactive", "true");
    }

    const query = searchParams.toString();
    const endpoint = `/categories${query ? `?${query}` : ""}`;
    const response = await api.get(endpoint);
    return (response && response.data && response.data.categories) || [];
  },

  /**
   * Fetch a single category by ID
   * Endpoint: GET /api/categories/:id
   */
  getCategoryById: async (id) => {
    const response = await api.get(`/categories/${id}`);
    return (response && response.data && response.data.category) || null;
  },

  /**
   * Create a new category
   * Endpoint: POST /api/categories
   */
  createCategory: async (categoryData) => {
    const response = await api.post("/categories", categoryData);
    return response && response.data ? response.data.category : response;
  },

  /**
   * Update an existing category
   * Endpoint: PATCH /api/categories/:id
   */
  updateCategory: async (id, categoryData) => {
    const response = await api.patch(`/categories/${id}`, categoryData);
    return response && response.data ? response.data.category : response;
  },

  /**
   * Delete a category (fails if products are assigned)
   * Endpoint: DELETE /api/categories/:id
   */
  deleteCategory: async (id) => {
    return await api.delete(`/categories/${id}`);
  },
};

export default categoryService;
