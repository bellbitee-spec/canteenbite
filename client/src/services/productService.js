import api from "./api";

export const getProducts = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.category) query.append("category", params.category);
  if (params.search) query.append("search", params.search);
  if (params.available !== undefined)
    query.append("available", params.available);

  const queryString = query.toString();
  const endpoint = queryString ? `products?${queryString}` : "products";
  const response = await api.get(endpoint);
  return response.data?.products || [];
};

export const getProductById = async (id) => {
  const response = await api.get(`products/${id}`);
  return response.data?.product || null;
};

export const getProductsByCategory = async (categoryId) => {
  const response = await api.get(`products/category/${categoryId}`);
  return response.data?.products || [];
};

export const searchProducts = async (search) => {
  const response = await api.get(
    `products?search=${encodeURIComponent(search)}`
  );
  return response.data?.products || [];
};

export const getCategories = async () => {
  const response = await api.get("categories");
  return response.data?.categories || [];
};

export const getCategoryById = async (id) => {
  const response = await api.get(`categories/${id}`);
  return response.data?.category || null;
};

const productService = {
  getProducts,
  getProductById,
  getProductsByCategory,
  searchProducts,
  getCategories,
  getCategoryById,
};

export default productService;
