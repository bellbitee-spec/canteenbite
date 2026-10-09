import api from "./api";

/**
 * Admin order service communicating with backend admin endpoints
 */
const orderService = {
  /**
   * Get order statistics for today grouped by status
   * Endpoint: GET /api/admin/orders/stats
   */
  getOrderStats: async () => {
    const response = await api.get("/admin/orders/stats");
    return response.stats || (response.data && response.data.stats) || {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      delayed: 0,
      completed: 0,
      cancelled: 0,
    };
  },

  /**
   * Get paginated orders list with filtering and search
   * Endpoint: GET /api/admin/orders
   */
  getOrders: async (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, value);
      }
    });

    const query = searchParams.toString();
    const endpoint = `/admin/orders${query ? `?${query}` : ""}`;
    return await api.get(endpoint);
  },

  /**
   * Get complete order details by order ID
   * Endpoint: GET /api/admin/orders/:id
   */
  getOrderById: async (id) => {
    return await api.get(`/admin/orders/${id}`);
  },

  /**
   * Update order status
   * Endpoint: PATCH /api/admin/orders/:id/status
   */
  updateOrderStatus: async (id, status, notes = "") => {
    return await api.patch(`/admin/orders/${id}/status`, { status, notes });
  },

  /**
   * Admin cancellation of an order
   * Endpoint: POST /api/admin/orders/:id/cancel
   */
  cancelOrder: async (id, reason) => {
    return await api.post(`/admin/orders/${id}/cancel`, { reason });
  },
};

export default orderService;
