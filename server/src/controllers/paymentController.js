const paymentService = require("../services/paymentService");

const formatPayment = (payment) => {
  if (!payment) return null;
  const obj = payment.toObject ? payment.toObject({ virtuals: true }) : payment;
  return {
    id: obj._id,
    order: obj.order,
    user: obj.user,
    method: obj.method,
    status: obj.status,
    amount: obj.amount,
    provider: obj.provider,
    providerPaymentId: obj.providerPaymentId,
    providerOrderId: obj.providerOrderId,
    paidAt: obj.paidAt,
    refundedAt: obj.refundedAt,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const formatOrder = (order) => {
  if (!order) return null;
  const obj = order.toObject ? order.toObject({ virtuals: true }) : order;
  return {
    id: obj._id,
    orderNumber: obj.orderNumber,
    user: obj.user,
    totalAmount: obj.totalAmount,
    orderStatus: obj.orderStatus,
    paymentMethod: obj.paymentMethod,
    paymentStatus: obj.paymentStatus,
    cancellationWindowOpen: obj.cancellationWindowOpen,
    cancelUntil: obj.cancelUntil,
    createdAt: obj.createdAt,
  };
};

/**
 * POST /api/payments/create-order (or /create)
 * Authenticated student creates a gateway payment order for their canteen order
 */
const createOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    const data = await paymentService.createPaymentOrder({
      orderId,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Online payment transaction initiated successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/verify
 * Authenticated student verifies the completed gateway payment with HMAC signature
 */
const verify = async (req, res, next) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    const userId = req.user._id;

    const result = await paymentService.verifyPayment({
      orderId,
      userId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        order: formatOrder(result.order),
        payment: formatPayment(result.payment),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/webhook
 * Public endpoint called by payment gateway to deliver asynchronous status notifications
 */
const webhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const result = await paymentService.handleWebhook({
      rawBody,
      signature,
      eventData: req.body,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    // Webhook errors return 400 with message
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Webhook processing failed",
    });
  }
};

/**
 * GET /api/payments/order/:orderId
 * Fetch payment status and transaction details for an order
 */
const getByOrderId = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const result = await paymentService.getPaymentByOrderId({
      orderId,
      userId,
      userRole,
    });

    return res.status(200).json({
      success: true,
      data: {
        order: formatOrder(result.order),
        payment: formatPayment(result.payment),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/fail
 * Report / record client-side payment dismissal or failure
 */
const reportFailure = async (req, res, next) => {
  try {
    const { orderId, reason, attemptedPaymentId } = req.body;
    const userId = req.user._id;

    const result = await paymentService.reportPaymentFailure({
      orderId,
      userId,
      reason,
      attemptedPaymentId,
    });

    return res.status(200).json({
      success: true,
      message: "Payment failure recorded",
      data: {
        payment: formatPayment(result.payment),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  verify,
  webhook,
  getByOrderId,
  reportFailure,
};
