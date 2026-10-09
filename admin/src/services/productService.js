import api from "./api";

/**
 * Admin Product Service
 */
const productService = {
  /**
   * Fetch products with query parameters
   * Endpoint: GET /api/products
   * Supported params: category, search, available ('true'/'false'), includeUnavailable ('true')
   */
  getProducts: async (params = {}) => {
    const searchParams = new URLSearchParams();

    // Default to including unavailable products for admin view
    searchParams.set("includeUnavailable", "true");

    if (params.search && params.search.trim()) {
      searchParams.set("search", params.search.trim());
    }

    if (params.category && params.category.trim()) {
      searchParams.set("category", params.category.trim());
    }

    if (params.available !== undefined && params.available !== null && params.available !== "") {
      searchParams.set("available", String(params.available));
    }

    const query = searchParams.toString();
    const endpoint = `/products${query ? `?${query}` : ""}`;
    const response = await api.get(endpoint);
    return (response && response.data && response.data.products) || [];
  },

  /**
   * Fetch a single product by ID
   * Endpoint: GET /api/products/:id
   */
  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return (response && response.data && response.data.product) || null;
  },

  /**
   * Create a new product
   * Endpoint: POST /api/products
   */
  createProduct: async (productData) => {
    const response = await api.post("/products", productData);
    return response && response.data ? response.data.product : response;
  },

  /**
   * Update an existing product
   * Endpoint: PATCH /api/products/:id
   */
  updateProduct: async (id, productData) => {
    const response = await api.patch(`/products/${id}`, productData);
    return response && response.data ? response.data.product : response;
  },

  /**
   * Soft-delete / disable a product
   * Endpoint: DELETE /api/products/:id
   */
  deleteProduct: async (id) => {
    return await api.delete(`/products/${id}`);
  },
};

export default productService;
