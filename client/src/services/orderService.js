import api from "./api";

/**
 * Student Order Service
 * Authoritative backend order interactions, status retrieval, and 30-second cancellation.
 */
const orderService = {
  /**
   * POST /api/orders
   * Create an order with backend validation and optional idempotency key
   * @param {Object} orderData - { items: [{ itemType, id, quantity }], paymentMethod: 'CASH' | 'ONLINE', notes }
   * @param {string} [idempotencyKey] - Unique key for preventing duplicate submissions
   */
  createOrder: async (orderData, idempotencyKey = null) => {
    const headers = {};
    if (idempotencyKey && typeof idempotencyKey === "string" && idempotencyKey.trim().length > 0) {
      headers["Idempotency-Key"] = idempotencyKey.trim();
    }

    const response = await api.post("/orders", orderData, { headers });
    return response.data?.order || response.order || response.data || response;
  },

  /**
   * GET /api/orders/:id
   * Fetch authoritative details of an individual order
   * @param {string} orderId - MongoDB ObjectId of the order
   */
  getMyOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data?.order || response.order || response.data || response;
  },

  /**
   * Alias for getMyOrder for backward compatibility
   */
  getOrderById: async (orderId) => {
    return orderService.getMyOrder(orderId);
  },

  /**
   * GET /api/orders
   * Fetch authenticated student's order history
   * @param {Object} [params] - Optional query parameters (e.g. pagination)
   */
  getMyOrders: async (params = {}) => {
    let endpoint = "/orders";
    if (params && typeof params === "object") {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, val);
        }
      });
      const queryString = query.toString();
      if (queryString) endpoint += `?${queryString}`;
    }

    const response = await api.get(endpoint);
    const list = response.data?.orders || response.orders || response.data || response;
    return Array.isArray(list) ? list : [];
  },

  /**
   * POST /api/orders/:id/cancel
   * Student 30-second window order cancellation
   * Backend independently and strictly enforces the window.
   * @param {string} orderId - MongoDB ObjectId of the order
   * @param {string} [reason] - Optional reason for cancellation
   */
  cancelOrder: async (orderId, reason = "") => {
    const response = await api.post(`/orders/${orderId}/cancel`, { reason });
    return response.data?.order || response.order || response.data || response;
  },
};

export default orderService;
