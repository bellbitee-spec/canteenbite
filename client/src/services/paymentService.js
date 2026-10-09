import api from "./api";

/**
 * Dynamically load the Razorpay checkout script if not already on the page
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      return resolve(false);
    }
    if (window.Razorpay) {
      return resolve(true);
    }
    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existingScript) {
      existingScript.onload = () => resolve(true);
      existingScript.onerror = () => resolve(false);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Student Online Payment Service
 * Authoritative interaction with server-side Razorpay endpoints
 */
const paymentService = {
  /**
   * POST /api/payments/create-order
   * Initializes a payment order on the server with authoritative amount
   */
  createPaymentOrder: async (orderId) => {
    const response = await api.post("/payments/create-order", { orderId });
    return response.data || response;
  },

  /**
   * POST /api/payments/verify
   * Submits cryptographic verification payload to the backend
   */
  verifyPayment: async ({
    orderId,
    razorpayPaymentId,
    razorpayOrderId,
    razorpaySignature,
  }) => {
    const response = await api.post("/payments/verify", {
      orderId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    });
    return response.data || response;
  },

  /**
   * GET /api/payments/order/:orderId
   * Fetch payment and order status
   */
  getPaymentDetails: async (orderId) => {
    const response = await api.get(`/payments/order/${orderId}`);
    return response.data || response;
  },

  /**
   * POST /api/payments/fail
   * Report dismissal or failure to backend
   */
  reportFailure: async ({ orderId, reason, attemptedPaymentId }) => {
    const response = await api.post("/payments/fail", {
      orderId,
      reason,
      attemptedPaymentId,
    });
    return response.data || response;
  },
};

export default paymentService;
