const orderService = require("../services/orderService");

const formatOrder = (order) => {
  if (!order) return null;
  const obj = order.toObject ? order.toObject({ virtuals: true }) : order;

  return {
    id: obj._id,
    orderNumber: obj.orderNumber,
    user: obj.user,
    items: (obj.items || []).map((item) => {
      const itemObj = item.toObject ? item.toObject({ virtuals: true }) : item;
      return {
        id: itemObj._id,
        itemType: itemObj.itemType,
        product: itemObj.product || null,
        combo: itemObj.combo || null,
        name: itemObj.name,
        image: itemObj.image || "",
        unitPrice: itemObj.unitPrice,
        quantity: itemObj.quantity,
        subtotal: itemObj.subtotal,
        snapshot: itemObj.snapshot || null,
      };
    }),
    subtotal: obj.subtotal,
    totalAmount: obj.totalAmount,
    orderStatus: obj.orderStatus,
    paymentMethod: obj.paymentMethod,
    paymentStatus: obj.paymentStatus,
    cancellationWindowOpen: obj.cancellationWindowOpen,
    cancelUntil: obj.cancelUntil,
    cancelledBy: obj.cancelledBy || null,
    cancelledAt: obj.cancelledAt || null,
    estimatedPreparationTime: obj.estimatedPreparationTime || obj.estimatedPreparationMinutes || 15,
    estimatedPreparationMinutes: obj.estimatedPreparationMinutes || obj.estimatedPreparationTime || 15,
    expectedReadyAt: obj.expectedReadyAt || obj.estimatedReadyAt || null,
    estimatedReadyAt: obj.estimatedReadyAt || obj.expectedReadyAt || null,
    preparationEstimateUpdatedAt: obj.preparationEstimateUpdatedAt || obj.updatedAt || null,
    serverTime: new Date().toISOString(),
    preparationStartedAt: obj.preparationStartedAt || null,
    readyAt: obj.readyAt || null,
    completedAt: obj.completedAt || null,
    delayedAt: obj.delayedAt || null,
    notes: obj.notes || "",
    idempotencyKey: obj.idempotencyKey || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

/**
 * POST /api/orders
 * Authenticated student creates a new order
 */
const createOrder = async (req, res) => {
  try {
    const { items, paymentMethod, notes } = req.body;
    const idempotencyKey =
      req.headers["idempotency-key"] ||
      req.header("idempotency-key") ||
      req.body.idempotencyKey;

    const order = await orderService.createOrder({
      userId: req.user._id,
      items,
      paymentMethod,
      notes,
      idempotencyKey,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        order: formatOrder(order),
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * GET /api/orders
 * Authenticated student retrieves their own order history
 */
const getMyOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrdersByUser(req.user._id);

    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: {
        orders: orders.map(formatOrder),
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * GET /api/orders/:id
 * Authenticated student retrieves a single order (user-isolated)
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      data: {
        order: formatOrder(order),
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * POST /api/orders/:id/cancel
 * Authenticated student cancels an order within 30-second window
 */
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, _forceInventoryFailure } = req.body;

    const order = await orderService.cancelOrder({
      orderId: id,
      userId: req.user._id,
      reason,
      _forceInventoryFailure,
    });

    const formattedOrder = formatOrder(order);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order: formattedOrder,
      data: {
        order: formattedOrder,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

const formatPayment = (p) => {
  if (!p) return null;
  const pObj = p.toObject ? p.toObject({ virtuals: true }) : p;
  return {
    id: pObj._id,
    method: pObj.method,
    status: pObj.status,
    amount: pObj.amount,
    provider: pObj.provider || null,
    providerPaymentId: pObj.providerPaymentId || null,
    providerOrderId: pObj.providerOrderId || null,
    paidAt: pObj.paidAt || null,
    refundedAt: pObj.refundedAt || null,
    createdAt: pObj.createdAt,
    updatedAt: pObj.updatedAt,
  };
};

const formatAdminOrder = (order) => {
  if (!order) return null;
  const obj = order.toObject ? order.toObject({ virtuals: true }) : order;

  let userData = null;
  if (obj.user && typeof obj.user === "object" && obj.user._id) {
    userData = {
      id: obj.user._id,
      name: obj.user.name,
      email: obj.user.email,
    };
  } else if (obj.user) {
    userData = { id: obj.user };
  }

  return {
    id: obj._id,
    orderNumber: obj.orderNumber,
    user: userData,
    items: (obj.items || []).map((item) => {
      const itemObj = item.toObject ? item.toObject({ virtuals: true }) : item;
      return {
        id: itemObj._id,
        itemType: itemObj.itemType,
        product: itemObj.product || null,
        combo: itemObj.combo || null,
        name: itemObj.name,
        image: itemObj.image || "",
        unitPrice: itemObj.unitPrice,
        quantity: itemObj.quantity,
        subtotal: itemObj.subtotal,
        snapshot: itemObj.snapshot || null,
      };
    }),
    subtotal: obj.subtotal,
    totalAmount: obj.totalAmount,
    orderStatus: obj.orderStatus,
    paymentMethod: obj.paymentMethod,
    paymentStatus: obj.paymentStatus,
    cancellationWindowOpen: obj.cancellationWindowOpen,
    cancelUntil: obj.cancelUntil,
    cancelledBy: obj.cancelledBy || null,
    cancelledAt: obj.cancelledAt || null,
    estimatedPreparationTime: obj.estimatedPreparationTime || obj.estimatedPreparationMinutes || 15,
    estimatedPreparationMinutes: obj.estimatedPreparationMinutes || obj.estimatedPreparationTime || 15,
    expectedReadyAt: obj.expectedReadyAt || obj.estimatedReadyAt || null,
    estimatedReadyAt: obj.estimatedReadyAt || obj.expectedReadyAt || null,
    preparationEstimateUpdatedAt: obj.preparationEstimateUpdatedAt || obj.updatedAt || null,
    serverTime: new Date().toISOString(),
    preparationStartedAt: obj.preparationStartedAt || null,
    readyAt: obj.readyAt || null,
    completedAt: obj.completedAt || null,
    delayedAt: obj.delayedAt || null,
    notes: obj.notes || "",
    idempotencyKey: obj.idempotencyKey || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

/**
 * GET /api/admin/orders
 * Admin list orders with filtering, search, and pagination
 */
const getAdminOrders = async (req, res) => {
  try {
    const result = await orderService.getAdminOrders(req.query);
    const formattedOrders = result.orders.map(formatAdminOrder);

    return res.status(200).json({
      success: true,
      orders: formattedOrders,
      data: {
        orders: formattedOrders,
      },
      pagination: result.pagination,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * GET /api/admin/orders/stats
 * Admin dashboard order count statistics for today
 */
const getAdminOrderStats = async (req, res) => {
  try {
    const stats = await orderService.getAdminOrderStats();

    return res.status(200).json({
      success: true,
      stats,
      data: {
        stats,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * GET /api/admin/orders/:id
 * Admin view complete order details with student and payment info
 */
const getAdminOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const { order, payment } = await orderService.getAdminOrderById(id);

    const formattedOrder = formatAdminOrder(order);
    formattedOrder.payment = formatPayment(payment);

    return res.status(200).json({
      success: true,
      order: formattedOrder,
      data: {
        order: formattedOrder,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * PATCH /api/admin/orders/:id/status
 * Admin update order lifecycle status with transition validation
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await orderService.updateOrderStatus(id, status);
    const formattedOrder = formatAdminOrder(order);

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: formattedOrder,
      data: {
        order: formattedOrder,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * POST /api/admin/orders/:id/cancel
 * Admin cancel an order with reason, restoring inventory
 */
const adminCancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, _forceInventoryFailure } = req.body;

    const order = await orderService.adminCancelOrder({
      orderId: id,
      adminId: req.user._id,
      reason,
      _forceInventoryFailure,
    });

    const formattedOrder = formatAdminOrder(order);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order: formattedOrder,
      data: {
        order: formattedOrder,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * PATCH /api/admin/orders/:id/payment
 * Admin record payment collection (e.g. Cash on Delivery / Counter collection)
 */
const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const order = await orderService.recordPayment({
      orderId: id,
      adminId: req.user._id,
      paymentStatus: paymentStatus || "PAID",
    });

    const formattedOrder = formatAdminOrder(order);

    return res.status(200).json({
      success: true,
      message: "Order payment status updated successfully",
      order: formattedOrder,
      data: {
        order: formattedOrder,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * PATCH /api/admin/orders/:id/preparation-time
 * Admin adjust estimated preparation time (+/- minutes, remaining minutes, or custom)
 */
const updatePreparationTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustmentMinutes, customMinutes, remainingMinutes, expectedUpdatedAt } = req.body;

    const order = await orderService.updatePreparationTime({
      orderId: id,
      adminId: req.user._id,
      adjustmentMinutes: adjustmentMinutes !== undefined ? parseInt(adjustmentMinutes, 10) : undefined,
      customMinutes: customMinutes !== undefined ? parseInt(customMinutes, 10) : undefined,
      remainingMinutes: remainingMinutes !== undefined ? parseInt(remainingMinutes, 10) : undefined,
      expectedUpdatedAt,
    });

    const formattedOrder = formatAdminOrder(order);

    return res.status(200).json({
      success: true,
      message: "Order preparation time updated successfully",
      order: formattedOrder,
      data: {
        order: formattedOrder,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAdminOrders,
  getAdminOrderStats,
  getAdminOrderById,
  updateOrderStatus,
  updatePreparationTime,
  adminCancelOrder,
  recordPayment,
};
