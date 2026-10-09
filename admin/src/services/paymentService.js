import api from "./api";

const paymentService = {
  /**
   * GET /api/payments/order/:orderId
   * Admin: Get payment details for an order
   */
  getPaymentByOrderId: async (orderId) => {
    const response = await api.get(`/payments/order/${orderId}`);
    return response.data || response;
  },
};

export default paymentService;
