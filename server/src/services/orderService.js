const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const Combo = require("../models/Combo");
const StoreSettings = require("../models/StoreSettings");
const User = require("../models/User");
const storeService = require("./storeService");
const { emitOrderUpdated } = require("../sockets");

let supportsReplicaSet = null;

/**
 * Check if current MongoDB instance supports replica set transactions
 */
const checkTransactionSupport = async () => {
  if (supportsReplicaSet !== null) return supportsReplicaSet;
  try {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Product.findOne({}).session(session);
      });
      supportsReplicaSet = true;
    } finally {
      await session.endSession();
    }
  } catch (err) {
    if (
      err.code === 20 ||
      (err.message && err.message.includes("replica set member or mongos"))
    ) {
      supportsReplicaSet = false;
    } else {
      supportsReplicaSet = true;
    }
  }
  return supportsReplicaSet;
};

/**
 * Read cancellationWindowSeconds from StoreSettings or fallback to 30s
 */
const getCancellationWindowSeconds = async (session = null) => {
  try {
    let query = StoreSettings.findOne();
    if (session) query = query.session(session);
    const settings = await query;
    if (
      settings &&
      typeof settings.cancellationWindowSeconds === "number" &&
      settings.cancellationWindowSeconds > 0
    ) {
      return settings.cancellationWindowSeconds;
    }
  } catch (_) {}
  return 30; // fallback default
};

/**
 * Generate human-friendly unique order number
 * Example format: CAN-20261008-7A1B2C
 */
const generateOrderNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;
  const randomSuffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `CAN-${dateStr}-${randomSuffix}`;
};

/**
 * Calculate aggregate inventory to restore from an order's items
 * Handles both direct products and combo components with multiplier
 */
const calculateInventoryToRestore = (orderItems) => {
  const inventoryToRestore = new Map();

  for (const item of orderItems) {
    if (item.itemType === "PRODUCT") {
      const prodId = (item.product?._id || item.product).toString();
      const qty = parseInt(item.quantity, 10);
      if (prodId && !isNaN(qty) && qty > 0) {
        inventoryToRestore.set(
          prodId,
          (inventoryToRestore.get(prodId) || 0) + qty
        );
      }
    } else if (item.itemType === "COMBO") {
      const comboQty = parseInt(item.quantity, 10);
      const components = item.snapshot?.items || [];
      for (const comp of components) {
        const compProdId = (comp.product?._id || comp.product).toString();
        const compQty = parseInt(comp.quantity, 10);
        if (
          compProdId &&
          !isNaN(compQty) &&
          compQty > 0 &&
          !isNaN(comboQty) &&
          comboQty > 0
        ) {
          const totalConsumed = compQty * comboQty;
          inventoryToRestore.set(
            compProdId,
            (inventoryToRestore.get(compProdId) || 0) + totalConsumed
          );
        }
      }
    }
  }

  return inventoryToRestore;
};

/**
 * Authoritative Order Creation with Atomic Inventory Handling
 */
const createOrder = async ({ userId, items, paymentMethod, notes, idempotencyKey }) => {
  const trimmedKey =
    idempotencyKey && typeof idempotencyKey === "string" && idempotencyKey.trim().length > 0
      ? idempotencyKey.trim()
      : null;

  // 1. Idempotency Check
  if (trimmedKey) {
    const existingOrder = await Order.findOne({
      user: userId,
      idempotencyKey: trimmedKey,
    }).populate("items");

    if (existingOrder) {
      return existingOrder;
    }
  }

  // 2. Authoritative Store Status Check (Part 16)
  const storeStatus = await storeService.getCurrentStoreStatus();
  if (!storeStatus.canOrder) {
    const err = new Error(
      storeStatus.reason || "Canteen is currently closed and not accepting orders."
    );
    err.statusCode = 400;
    throw err;
  }

  const defaultPreparationTime = storeStatus.defaultPreparationTime || 10;
  const hasReplicaSet = await checkTransactionSupport();

  let order;
  if (hasReplicaSet) {
    // Mode A: Native MongoDB Replica Set Transactions
    order = await executeWithReplicaSetTransaction({
      userId,
      items,
      paymentMethod,
      notes,
      trimmedKey,
      defaultPreparationTime,
    });
  } else {
    // Mode B: Atomic Compensation Flow for Standalone MongoDB
    order = await executeWithAtomicCompensation({
      userId,
      items,
      paymentMethod,
      notes,
      trimmedKey,
      defaultPreparationTime,
    });
  }

  // Realtime emission: notify admin kitchen board of new order
  if (order) {
    emitOrderUpdated(order);
  }

  return order;
};

/**
 * Execution using native MongoDB multi-document transactions (when replica set is available)
 */
const executeWithReplicaSetTransaction = async ({
  userId,
  items,
  paymentMethod,
  notes,
  trimmedKey,
  defaultPreparationTime = 10,
}) => {
  const session = await mongoose.startSession();
  let createdOrderId = null;

  try {
    await session.withTransaction(async () => {
      const {
        productRequiredQty,
        preparedOrderItems,
        calculatedSubtotal,
        maxPreparationTime,
      } = await prepareOrderData(items, session);

      // Atomic Inventory Decrement
      for (const [productId, requiredQty] of productRequiredQty.entries()) {
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: productId,
            isAvailable: true,
            stock: { $gte: requiredQty },
          },
          {
            $inc: { stock: -requiredQty },
          },
          {
            new: true,
            session,
          }
        );

        if (!updatedProduct) {
          const currentProd = await Product.findById(productId).session(session);
          const prodName = currentProd ? currentProd.name : productId;
          const currentStock = currentProd ? currentProd.stock : 0;
          const err = new Error(
            `Insufficient stock for "${prodName}". Requested: ${requiredQty}, Available: ${currentStock}`
          );
          err.statusCode = 409;
          throw err;
        }
      }

      // Persist Order Items
      const createdOrderItems = await OrderItem.create(preparedOrderItems, { session });
      const orderItemIds = createdOrderItems.map((item) => item._id);

      const fallbackPrepTime =
        typeof defaultPreparationTime === "number" && defaultPreparationTime >= 0
          ? defaultPreparationTime
          : 10;
      const estimatedPreparationTime =
        maxPreparationTime > 0 ? maxPreparationTime : fallbackPrepTime;
      const expectedReadyAt = new Date(Date.now() + estimatedPreparationTime * 60 * 1000);
      const orderNumber = generateOrderNumber();

      // Cancellation Window Calculation (Part 9)
      const cancellationWindowSeconds = await getCancellationWindowSeconds(session);
      const cancelUntil = new Date(Date.now() + cancellationWindowSeconds * 1000);

      // Create Order
      const [newOrder] = await Order.create(
        [
          {
            orderNumber,
            user: userId,
            items: orderItemIds,
            subtotal: calculatedSubtotal,
            totalAmount: calculatedSubtotal,
            orderStatus: "PENDING",
            paymentMethod,
            paymentStatus: "PENDING",
            cancellationWindowOpen: true,
            cancelUntil,
            estimatedPreparationTime,
            expectedReadyAt,
            notes: notes ? notes.trim() : "",
            idempotencyKey: trimmedKey,
          },
        ],
        { session }
      );

      // Create Payment
      await Payment.create(
        [
          {
            order: newOrder._id,
            user: userId,
            method: paymentMethod,
            status: "PENDING",
            amount: calculatedSubtotal,
          },
        ],
        { session }
      );

      createdOrderId = newOrder._id;
    });
  } catch (err) {
    if (
      trimmedKey &&
      (err.code === 11000 || (err.message && err.message.includes("E11000")))
    ) {
      const existing = await Order.findOne({
        user: userId,
        idempotencyKey: trimmedKey,
      }).populate("items");
      if (existing) {
        return existing;
      }
    }
    throw err;
  } finally {
    await session.endSession();
  }

  return await Order.findById(createdOrderId).populate("items");
};

/**
 * Execution using Atomic Conditional Updates and Rollback Compensation (for Standalone MongoDB)
 */
const executeWithAtomicCompensation = async ({
  userId,
  items,
  paymentMethod,
  notes,
  trimmedKey,
  defaultPreparationTime = 10,
}) => {
  const {
    productRequiredQty,
    preparedOrderItems,
    calculatedSubtotal,
    maxPreparationTime,
  } = await prepareOrderData(items);

  const decrementedProducts = [];
  let createdOrderItems = [];
  let newOrder = null;
  let newPayment = null;

  try {
    // Step 1: Atomic Inventory Decrement with Compensation Tracking
    for (const [productId, requiredQty] of productRequiredQty.entries()) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          isAvailable: true,
          stock: { $gte: requiredQty },
        },
        {
          $inc: { stock: -requiredQty },
        },
        {
          new: true,
        }
      );

      if (!updatedProduct) {
        const currentProd = await Product.findById(productId);
        const prodName = currentProd ? currentProd.name : productId;
        const currentStock = currentProd ? currentProd.stock : 0;
        const err = new Error(
          `Insufficient stock for "${prodName}". Requested: ${requiredQty}, Available: ${currentStock}`
        );
        err.statusCode = 409;
        throw err;
      }

      decrementedProducts.push({ productId, requiredQty });
    }

    // Step 2: Persist OrderItems
    createdOrderItems = await OrderItem.create(preparedOrderItems);
    const orderItemIds = createdOrderItems.map((item) => item._id);

    // Step 3: Calculate Timings, Cancellation Window, and Order Number
    const fallbackPrepTime =
      typeof defaultPreparationTime === "number" && defaultPreparationTime >= 0
        ? defaultPreparationTime
        : 10;
    const estimatedPreparationTime =
      maxPreparationTime > 0 ? maxPreparationTime : fallbackPrepTime;
    const expectedReadyAt = new Date(Date.now() + estimatedPreparationTime * 60 * 1000);
    const orderNumber = generateOrderNumber();

    const cancellationWindowSeconds = await getCancellationWindowSeconds();
    const cancelUntil = new Date(Date.now() + cancellationWindowSeconds * 1000);

    // Step 4: Persist Order
    newOrder = await Order.create({
      orderNumber,
      user: userId,
      items: orderItemIds,
      subtotal: calculatedSubtotal,
      totalAmount: calculatedSubtotal,
      orderStatus: "PENDING",
      paymentMethod,
      paymentStatus: "PENDING",
      cancellationWindowOpen: true,
      cancelUntil,
      estimatedPreparationTime,
      expectedReadyAt,
      notes: notes ? notes.trim() : "",
      idempotencyKey: trimmedKey,
    });

    // Step 5: Persist Payment
    newPayment = await Payment.create({
      order: newOrder._id,
      user: userId,
      method: paymentMethod,
      status: "PENDING",
      amount: calculatedSubtotal,
    });

    return await Order.findById(newOrder._id).populate("items");
  } catch (err) {
    // ROLLBACK EVERYTHING upon any error
    // 1. Restore all decremented stock atomically
    for (const { productId, requiredQty } of decrementedProducts) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: requiredQty },
      });
    }

    // 2. Remove any created payment
    if (newPayment && newPayment._id) {
      await Payment.findByIdAndDelete(newPayment._id);
    }

    // 3. Remove any created order
    if (newOrder && newOrder._id) {
      await Order.findByIdAndDelete(newOrder._id);
    }

    // 4. Remove any created order items
    if (createdOrderItems.length > 0) {
      const idsToDelete = createdOrderItems.map((i) => i._id);
      await OrderItem.deleteMany({ _id: { $in: idsToDelete } });
    }

    // If this was a concurrent duplicate submission with the same idempotencyKey, return existing order
    if (
      trimmedKey &&
      (err.code === 11000 || (err.message && err.message.includes("E11000")))
    ) {
      const existingOrder = await Order.findOne({
        user: userId,
        idempotencyKey: trimmedKey,
      }).populate("items");

      if (existingOrder) {
        return existingOrder;
      }
    }

    throw err;
  }
};

/**
 * Shared helper to validate items, fetch authoritative prices, and aggregate stock requirements
 */
const prepareOrderData = async (items, session = null) => {
  const productRequiredQty = new Map();
  const preparedOrderItems = [];
  let calculatedSubtotal = 0;
  let maxPreparationTime = 0;

  for (const item of items) {
    const itemQty = parseInt(item.quantity, 10);
    if (isNaN(itemQty) || itemQty < 1) {
      const err = new Error(`Invalid quantity for item: ${item.id}`);
      err.statusCode = 400;
      throw err;
    }

    if (item.itemType === "PRODUCT") {
      let query = Product.findById(item.id);
      if (session) query = query.session(session);
      const product = await query;

      if (!product) {
        const err = new Error(`Product not found with id: ${item.id}`);
        err.statusCode = 404;
        throw err;
      }

      if (product.isAvailable !== true) {
        const err = new Error(`Product "${product.name}" is currently unavailable`);
        err.statusCode = 409;
        throw err;
      }

      const lineSubtotal = product.price * itemQty;
      calculatedSubtotal += lineSubtotal;
      maxPreparationTime = Math.max(maxPreparationTime, product.preparationTime || 0);

      const prodIdStr = product._id.toString();
      productRequiredQty.set(
        prodIdStr,
        (productRequiredQty.get(prodIdStr) || 0) + itemQty
      );

      preparedOrderItems.push({
        itemType: "PRODUCT",
        product: product._id,
        combo: null,
        name: product.name,
        image: product.image || "",
        unitPrice: product.price,
        quantity: itemQty,
        subtotal: lineSubtotal,
        snapshot: {
          name: product.name,
          image: product.image || "",
          price: product.price,
          category: product.category,
        },
      });
    } else if (item.itemType === "COMBO") {
      let query = Combo.findById(item.id).populate("items.product");
      if (session) query = query.session(session);
      const combo = await query;

      if (!combo) {
        const err = new Error(`Combo not found with id: ${item.id}`);
        err.statusCode = 404;
        throw err;
      }

      if (combo.isAvailable !== true) {
        const err = new Error(`Combo "${combo.name}" is currently unavailable`);
        err.statusCode = 409;
        throw err;
      }

      const lineSubtotal = combo.price * itemQty;
      calculatedSubtotal += lineSubtotal;
      maxPreparationTime = Math.max(maxPreparationTime, combo.preparationTime || 0);

      const comboComponentsSnapshot = [];

      for (const comboItem of combo.items) {
        const componentProduct = comboItem.product;
        if (!componentProduct) {
          const err = new Error(`Component product in combo "${combo.name}" not found`);
          err.statusCode = 404;
          throw err;
        }

        if (componentProduct.isAvailable !== true) {
          const err = new Error(
            `Product "${componentProduct.name}" in combo "${combo.name}" is currently unavailable`
          );
          err.statusCode = 409;
          throw err;
        }

        const requiredForCombo = comboItem.quantity * itemQty;
        const compProdIdStr = componentProduct._id.toString();
        productRequiredQty.set(
          compProdIdStr,
          (productRequiredQty.get(compProdIdStr) || 0) + requiredForCombo
        );

        comboComponentsSnapshot.push({
          product: componentProduct._id,
          name: componentProduct.name,
          quantity: comboItem.quantity,
          price: componentProduct.price,
        });
      }

      preparedOrderItems.push({
        itemType: "COMBO",
        product: null,
        combo: combo._id,
        name: combo.name,
        image: combo.image || "",
        unitPrice: combo.price,
        quantity: itemQty,
        subtotal: lineSubtotal,
        snapshot: {
          name: combo.name,
          image: combo.image || "",
          price: combo.price,
          items: comboComponentsSnapshot,
        },
      });
    } else {
      const err = new Error(`Unsupported item type: ${item.itemType}`);
      err.statusCode = 400;
      throw err;
    }
  }

  return {
    productRequiredQty,
    preparedOrderItems,
    calculatedSubtotal,
    maxPreparationTime,
  };
};

/**
 * Cancel an order within 30-second cancellation window and atomically restore inventory
 */
const cancelOrder = async ({
  orderId,
  userId,
  reason,
  _forceInventoryFailure = false,
}) => {
  // 1. Fetch order and items
  const order = await Order.findById(orderId).populate("items");
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  // 2. Ownership verification
  if (order.user.toString() !== userId.toString()) {
    const err = new Error("Access forbidden: You cannot cancel another user's order");
    err.statusCode = 403;
    throw err;
  }

  // 3. Status checks
  if (order.orderStatus === "CANCELLED") {
    const err = new Error("Order is already cancelled");
    err.statusCode = 400;
    throw err;
  }

  if (order.orderStatus === "COMPLETED") {
    const err = new Error("Completed orders cannot be cancelled");
    err.statusCode = 400;
    throw err;
  }

  // 4. Time window check (strict, no extra grace period)
  const now = new Date();
  if (
    !order.cancelUntil ||
    now >= new Date(order.cancelUntil) ||
    order.cancellationWindowOpen === false
  ) {
    const err = new Error("The 30-second cancellation window has expired.");
    err.statusCode = 400;
    throw err;
  }

  const cancellationReason =
    reason && typeof reason === "string" && reason.trim().length > 0
      ? reason.trim().slice(0, 500)
      : "Cancelled by student";

  const hasReplicaSet = await checkTransactionSupport();

  let cancelledOrder;
  if (hasReplicaSet) {
    cancelledOrder = await executeCancelWithReplicaSetTransaction({
      orderId,
      userId,
      order,
      reason: cancellationReason,
      now,
      _forceInventoryFailure,
    });
  } else {
    cancelledOrder = await executeCancelWithAtomicCompensation({
      orderId,
      userId,
      order,
      reason: cancellationReason,
      now,
      _forceInventoryFailure,
    });
  }

  emitOrderUpdated(cancelledOrder);
  return cancelledOrder;
};

/**
 * Resolves refund status and payment update payload for cancelled orders.
 * Never claims refund occurred without confirmation from gateway.
 */
const resolveCancellationPaymentStatus = async ({
  orderId,
  isPaid,
  orderAmount,
  reason,
  now,
  session = null,
}) => {
  if (!isPaid) {
    return {
      paymentStatus: "FAILED",
      paymentUpdate: {
        status: "FAILED",
        metadata: { cancellationReason: reason },
      },
    };
  }

  let paymentQuery = Payment.findOne({ order: orderId });
  if (session) paymentQuery = paymentQuery.session(session);
  const existingPayment = await paymentQuery;

  const paymentService = require("./paymentService");
  const refundResult = await paymentService.processOrderRefund({
    payment: existingPayment,
    amount: orderAmount,
    reason,
  });

  if (refundResult.success) {
    return {
      paymentStatus: "REFUNDED",
      paymentUpdate: {
        status: "REFUNDED",
        refundedAt: refundResult.refundedAt || now,
        refundId: refundResult.refundId,
        metadata: {
          refundId: refundResult.refundId,
          refundReason: reason,
        },
      },
    };
  }

  return {
    paymentStatus: "PAID",
    paymentUpdate: {
      status: "PAID",
      metadata: {
        refundRequired: true,
        refundError: refundResult.error,
        cancellationReason: reason,
      },
    },
  };
};

/**
 * Cancellation via MongoDB Transaction (when replica set available)
 */
const executeCancelWithReplicaSetTransaction = async ({
  orderId,
  userId,
  order,
  reason,
  now,
  _forceInventoryFailure,
}) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { paymentStatus, paymentUpdate } =
        await resolveCancellationPaymentStatus({
          orderId,
          isPaid: order.paymentStatus === "PAID",
          orderAmount: order.totalAmount,
          reason,
          now,
          session,
        });

      // Atomic query prevents race condition between concurrent requests
      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: orderId,
          user: userId,
          orderStatus: { $nin: ["CANCELLED", "COMPLETED"] },
          cancellationWindowOpen: true,
          cancelUntil: { $gt: now },
        },
        {
          $set: {
            orderStatus: "CANCELLED",
            paymentStatus,
            cancellationWindowOpen: false,
            cancelledBy: "STUDENT",
            cancelledAt: now,
            cancellationReason: reason,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!updatedOrder) {
        const err = new Error(
          "Order is already cancelled, completed, or cancellation window has expired."
        );
        err.statusCode = 400;
        throw err;
      }

      await Payment.findOneAndUpdate(
        { order: orderId },
        { $set: paymentUpdate },
        { session }
      );

      if (_forceInventoryFailure) {
        const err = new Error("Forced inventory restoration failure for transaction rollback test");
        err.statusCode = 500;
        throw err;
      }

      // Restore inventory
      const inventoryToRestore = calculateInventoryToRestore(order.items);
      for (const [productId, qtyToRestore] of inventoryToRestore.entries()) {
        const updatedProd = await Product.findByIdAndUpdate(
          productId,
          { $inc: { stock: qtyToRestore } },
          { new: true, session }
        );
        if (!updatedProd) {
          const err = new Error(`Product ${productId} not found during stock restoration`);
          err.statusCode = 500;
          throw err;
        }
      }
    });

    return await Order.findById(orderId).populate("items");
  } finally {
    await session.endSession();
  }
};

/**
 * Cancellation via Atomic Conditional Updates and Rollback Compensation (for Standalone MongoDB)
 */
const executeCancelWithAtomicCompensation = async ({
  orderId,
  userId,
  order,
  reason,
  now,
  _forceInventoryFailure,
}) => {
  const { paymentStatus, paymentUpdate } =
    await resolveCancellationPaymentStatus({
      orderId,
      isPaid: order.paymentStatus === "PAID",
      orderAmount: order.totalAmount,
      reason,
      now,
    });

  // 1. Atomic order mutation: prevents duplicate or concurrent cancellations
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      user: userId,
      orderStatus: { $nin: ["CANCELLED", "COMPLETED"] },
      cancellationWindowOpen: true,
      cancelUntil: { $gt: now },
    },
    {
      $set: {
        orderStatus: "CANCELLED",
        paymentStatus,
        cancellationWindowOpen: false,
        cancelledBy: "STUDENT",
        cancelledAt: now,
        cancellationReason: reason,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedOrder) {
    const err = new Error(
      "Order is already cancelled, completed, or cancellation window has expired."
    );
    err.statusCode = 400;
    throw err;
  }

  await Payment.findOneAndUpdate(
    { order: orderId },
    { $set: paymentUpdate }
  );

  // 2. Restore inventory with rollback tracking
  const inventoryToRestore = calculateInventoryToRestore(order.items);
  const restoredProducts = [];

  try {
    if (_forceInventoryFailure) {
      const err = new Error("Forced inventory restoration failure for transaction rollback test");
      err.statusCode = 500;
      throw err;
    }

    for (const [productId, qtyToRestore] of inventoryToRestore.entries()) {
      const updatedProd = await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: qtyToRestore } },
        { new: true }
      );
      if (!updatedProd) {
        const err = new Error(`Product ${productId} not found during stock restoration`);
        err.statusCode = 500;
        throw err;
      }
      restoredProducts.push({ productId, qtyToRestore });
    }

    return await Order.findById(orderId).populate("items");
  } catch (err) {
    // Rollback: revert restored products
    for (const { productId, qtyToRestore } of restoredProducts) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: -qtyToRestore },
      });
    }

    // Rollback: revert order status back to original state
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        orderStatus: order.orderStatus,
        cancellationWindowOpen: order.cancellationWindowOpen,
        cancelledBy: order.cancelledBy,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
      },
    });

    throw err;
  }
};

/**
 * Retrieve all orders belonging to the authenticated student
 */
const getOrdersByUser = async (userId) => {
  return await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("items");
};

/**
 * Retrieve a specific order by ID, enforcing user isolation
 */
const getOrderById = async (orderId, userId) => {
  const order = await Order.findById(orderId).populate("items");
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (order.user.toString() !== userId.toString()) {
    const err = new Error("Access forbidden: You cannot view this order");
    err.statusCode = 403;
    throw err;
  }

  return order;
};

/**
 * Admin: Get paginated, filtered, and searched list of orders
 */
const getAdminOrders = async ({
  status,
  paymentStatus,
  paymentMethod,
  search,
  from,
  to,
  page,
  limit,
}) => {
  const filter = {};

  if (status && typeof status === "string" && status.trim()) {
    filter.orderStatus = status.trim().toUpperCase();
  }

  if (paymentStatus && typeof paymentStatus === "string" && paymentStatus.trim()) {
    filter.paymentStatus = paymentStatus.trim().toUpperCase();
  }

  if (paymentMethod && typeof paymentMethod === "string" && paymentMethod.trim()) {
    const pm = paymentMethod.trim().toUpperCase();
    if (pm === "COD" || pm === "CASH") {
      filter.paymentMethod = { $in: ["COD", "CASH"] };
    } else {
      filter.paymentMethod = pm;
    }
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        filter.createdAt.$gte = fromDate;
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        if (typeof to === "string" && to.length === 10) {
          toDate.setHours(23, 59, 59, 999);
        }
        filter.createdAt.$lte = toDate;
      }
    }
  }

  if (search && typeof search === "string" && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const matchingUsers = await User.find(
      {
        $or: [{ name: regex }, { email: regex }],
      },
      { _id: 1 }
    );

    const matchingUserIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { orderNumber: regex },
      { user: { $in: matchingUserIds } },
    ];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const total = await Order.countDocuments(filter);
  const totalPages = Math.ceil(total / parsedLimit);

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit)
    .populate("user", "name email role")
    .populate("items");

  return {
    orders,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages,
    },
  };
};

/**
 * Admin: Get today's order statistics grouped by status
 * Timezone-aware date boundaries for India Standard Time (IST, UTC+5:30)
 */
const getAdminOrderStats = async () => {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const now = new Date();
  const istNow = new Date(now.getTime() + istOffsetMs);
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const date = istNow.getUTCDate();

  const startOfTodayUTC = new Date(Date.UTC(year, month, date, 0, 0, 0, 0) - istOffsetMs);
  const endOfTodayUTC = new Date(Date.UTC(year, month, date, 23, 59, 59, 999) - istOffsetMs);

  const aggregation = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfTodayUTC,
          $lte: endOfTodayUTC,
        },
      },
    },
    {
      $group: {
        _id: "$orderStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const stats = {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    delayed: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const row of aggregation) {
    const key = row._id ? row._id.toLowerCase() : null;
    if (key && Object.prototype.hasOwnProperty.call(stats, key)) {
      stats[key] = row.count;
    }
  }

  return stats;
};

/**
 * Admin: Get detailed order information including user and associated payment
 */
const getAdminOrderById = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate("user", "name email role")
    .populate("items");

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  const payment = await Payment.findOne({ order: order._id });

  return {
    order,
    payment,
  };
};

/**
 * Admin: Update order lifecycle status with transition validation and timestamps
 */
const updateOrderStatus = async (orderId, newStatus) => {
  const ALLOWED_STATUS_TRANSITIONS = {
    PENDING: ["CONFIRMED"],
    CONFIRMED: ["PREPARING"],
    PREPARING: ["READY", "DELAYED"],
    DELAYED: ["PREPARING", "READY"],
    READY: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
  };

  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  const currentStatus = order.orderStatus;

  if (currentStatus === newStatus) {
    return await Order.findById(orderId)
      .populate("user", "name email role")
      .populate("items");
  }

  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    const err = new Error(
      `Invalid order status transition from ${currentStatus} to ${newStatus}.`
    );
    err.statusCode = 400;
    throw err;
  }

  // Prevent order confirmation before payment confirmation for ONLINE orders
  if (
    newStatus === "CONFIRMED" &&
    order.paymentMethod === "ONLINE" &&
    order.paymentStatus !== "PAID"
  ) {
    const err = new Error(
      "Cannot confirm an online order before payment is completed."
    );
    err.statusCode = 400;
    throw err;
  }

  const updateDoc = {
    orderStatus: newStatus,
  };

  const now = new Date();
  if (newStatus === "PREPARING") {
    updateDoc.preparationStartedAt = now;
  } else if (newStatus === "READY") {
    updateDoc.readyAt = now;
  } else if (newStatus === "COMPLETED") {
    updateDoc.completedAt = now;
  } else if (newStatus === "DELAYED") {
    updateDoc.delayedAt = now;
  }

  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      orderStatus: currentStatus,
    },
    {
      $set: updateDoc,
    },
    {
      new: true,
    }
  )
    .populate("user", "name email role")
    .populate("items");

  if (!updatedOrder) {
    const current = await Order.findById(orderId);
    const err = new Error(
      `Order status was concurrently modified to ${current?.orderStatus || "unknown"}. Please refresh and retry.`
    );
    err.statusCode = 409;
    throw err;
  }

  emitOrderUpdated(updatedOrder);
  return updatedOrder;
};

/**
 * Admin: Cancel an order with a required reason, unrestricted by the 30-second window
 */
const adminCancelOrder = async ({
  orderId,
  adminId,
  reason,
  _forceInventoryFailure = false,
}) => {
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    const err = new Error("Cancellation reason is required.");
    err.statusCode = 400;
    throw err;
  }

  const trimmedReason = reason.trim().slice(0, 500);

  const order = await Order.findById(orderId).populate("items");
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (order.orderStatus === "CANCELLED") {
    const err = new Error("Order is already cancelled.");
    err.statusCode = 400;
    throw err;
  }

  if (order.orderStatus === "COMPLETED") {
    const err = new Error("This order cannot be cancelled.");
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const hasReplicaSet = await checkTransactionSupport();

  let cancelledOrder;
  if (hasReplicaSet) {
    cancelledOrder = await executeAdminCancelWithReplicaSetTransaction({
      orderId,
      order,
      reason: trimmedReason,
      now,
      _forceInventoryFailure,
    });
  } else {
    cancelledOrder = await executeAdminCancelWithAtomicCompensation({
      orderId,
      order,
      reason: trimmedReason,
      now,
      _forceInventoryFailure,
    });
  }

  emitOrderUpdated(cancelledOrder);
  return cancelledOrder;
};

const executeAdminCancelWithReplicaSetTransaction = async ({
  orderId,
  order,
  reason,
  now,
  _forceInventoryFailure,
}) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { paymentStatus, paymentUpdate } =
        await resolveCancellationPaymentStatus({
          orderId,
          isPaid: order.paymentStatus === "PAID",
          orderAmount: order.totalAmount,
          reason,
          now,
          session,
        });

      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: orderId,
          orderStatus: { $nin: ["CANCELLED", "COMPLETED"] },
        },
        {
          $set: {
            orderStatus: "CANCELLED",
            paymentStatus,
            cancellationWindowOpen: false,
            cancelledBy: "ADMIN",
            cancelledAt: now,
            cancellationReason: reason,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!updatedOrder) {
        const err = new Error("This order cannot be cancelled.");
        err.statusCode = 400;
        throw err;
      }

      await Payment.findOneAndUpdate(
        { order: orderId },
        { $set: paymentUpdate },
        { session }
      );

      if (_forceInventoryFailure) {
        const err = new Error("Forced inventory restoration failure for rollback test");
        err.statusCode = 500;
        throw err;
      }

      const inventoryToRestore = calculateInventoryToRestore(order.items);
      for (const [productId, qtyToRestore] of inventoryToRestore.entries()) {
        const updatedProd = await Product.findByIdAndUpdate(
          productId,
          { $inc: { stock: qtyToRestore } },
          { new: true, session }
        );
        if (!updatedProd) {
          const err = new Error(`Product ${productId} not found during stock restoration`);
          err.statusCode = 500;
          throw err;
        }
      }
    });

    return await Order.findById(orderId)
      .populate("user", "name email role")
      .populate("items");
  } finally {
    await session.endSession();
  }
};

const executeAdminCancelWithAtomicCompensation = async ({
  orderId,
  order,
  reason,
  now,
  _forceInventoryFailure,
}) => {
  const { paymentStatus, paymentUpdate } =
    await resolveCancellationPaymentStatus({
      orderId,
      isPaid: order.paymentStatus === "PAID",
      orderAmount: order.totalAmount,
      reason,
      now,
    });

  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      orderStatus: { $nin: ["CANCELLED", "COMPLETED"] },
    },
    {
      $set: {
        orderStatus: "CANCELLED",
        paymentStatus,
        cancellationWindowOpen: false,
        cancelledBy: "ADMIN",
        cancelledAt: now,
        cancellationReason: reason,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedOrder) {
    const err = new Error("This order cannot be cancelled.");
    err.statusCode = 400;
    throw err;
  }

  await Payment.findOneAndUpdate(
    { order: orderId },
    { $set: paymentUpdate }
  );

  const inventoryToRestore = calculateInventoryToRestore(order.items);
  const restoredProducts = [];

  try {
    if (_forceInventoryFailure) {
      const err = new Error("Forced inventory restoration failure for rollback test");
      err.statusCode = 500;
      throw err;
    }

    for (const [productId, qtyToRestore] of inventoryToRestore.entries()) {
      const updatedProd = await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: qtyToRestore } },
        { new: true }
      );
      if (!updatedProd) {
        const err = new Error(`Product ${productId} not found during stock restoration`);
        err.statusCode = 500;
        throw err;
      }
      restoredProducts.push({ productId, qtyToRestore });
    }

    return await Order.findById(orderId)
      .populate("user", "name email role")
      .populate("items");
  } catch (err) {
    for (const { productId, qtyToRestore } of restoredProducts) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: -qtyToRestore },
      });
    }

    await Order.findByIdAndUpdate(orderId, {
      $set: {
        orderStatus: order.orderStatus,
        cancellationWindowOpen: order.cancellationWindowOpen,
        cancelledBy: order.cancelledBy,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
      },
    });

    throw err;
  }
};

/**
 * System-Initiated Cancellation for Failed or Abandoned Online Orders
 * Guarantees atomic exact inventory restoration, idempotency, and prevents double restoration.
 */
const systemCancelUnpaidOrder = async ({
  orderId,
  reason = "Online payment failed or abandoned",
}) => {
  const order = await Order.findById(orderId).populate("items");
  if (!order) return null;

  // Only PENDING unpaid orders can be cancelled by system
  if (order.orderStatus !== "PENDING" || order.paymentStatus === "PAID") {
    return null;
  }

  const now = new Date();
  const paymentUpdate = {
    status: "FAILED",
    metadata: { cancellationReason: reason, cancelledAt: now },
  };

  // Atomic conditional mutation: only the first concurrent winner succeeds
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      orderStatus: "PENDING",
      paymentStatus: { $ne: "PAID" },
    },
    {
      $set: {
        orderStatus: "CANCELLED",
        paymentStatus: "FAILED",
        cancellationWindowOpen: false,
        cancelledBy: "SYSTEM",
        cancelledAt: now,
        cancellationReason: reason,
      },
    },
    { new: true }
  ).populate("items");

  if (!updatedOrder) {
    // Another concurrent process already updated this order; abort to prevent double-restoration
    return null;
  }

  await Payment.findOneAndUpdate(
    { order: orderId, status: { $ne: "PAID" } },
    { $set: paymentUpdate }
  );

  // Exact Authoritative Inventory Restoration
  const inventoryToRestore = calculateInventoryToRestore(order.items);
  for (const [productId, qtyToRestore] of inventoryToRestore.entries()) {
    await Product.findByIdAndUpdate(productId, {
      $inc: { stock: qtyToRestore },
    });
  }

  try {
    emitOrderUpdated(updatedOrder);
  } catch (_) {}

  return updatedOrder;
};

/**
 * Periodically Releases Inventory from Abandoned Online Orders
 * Scans for ONLINE orders older than timeoutMinutes that remain in PENDING payment state.
 */
const cleanupAbandonedOnlineOrders = async (timeoutMinutes = 15) => {
  const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  const abandonedOrders = await Order.find({
    paymentMethod: "ONLINE",
    orderStatus: "PENDING",
    paymentStatus: "PENDING",
    createdAt: { $lte: cutoffTime },
  });

  const releasedOrders = [];
  for (const order of abandonedOrders) {
    const cancelled = await systemCancelUnpaidOrder({
      orderId: order._id,
      reason: `Online payment timed out (abandoned after ${timeoutMinutes} minutes)`,
    });
    if (cancelled) {
      releasedOrders.push(cancelled);
    }
  }

  return releasedOrders;
};

/**
 * Admin: Record payment collection (e.g. Cash on Delivery / Counter collection)
 */
const recordPayment = async ({ orderId, adminId, paymentStatus = "PAID" }) => {
  const order = await Order.findById(orderId).populate("items");
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (order.orderStatus === "CANCELLED") {
    const err = new Error("Cannot record payment for a cancelled order");
    err.statusCode = 400;
    throw err;
  }

  const validStatuses = ["PAID", "PENDING", "FAILED"];
  const targetStatus = (paymentStatus || "PAID").toUpperCase();
  if (!validStatuses.includes(targetStatus)) {
    const err = new Error(`Invalid payment status: ${paymentStatus}`);
    err.statusCode = 400;
    throw err;
  }

  // Update order paymentStatus
  const updatedOrder = await Order.findByIdAndUpdate(
    orderId,
    { $set: { paymentStatus: targetStatus } },
    { new: true }
  )
    .populate("user", "name email role")
    .populate("items");

  // Update payment record
  const paymentUpdate = {
    status: targetStatus,
  };
  if (targetStatus === "PAID") {
    paymentUpdate.paidAt = new Date();
    paymentUpdate.provider =
      order.paymentMethod === "ONLINE" ? "ONLINE_MANUAL" : order.paymentMethod;
  }

  await Payment.findOneAndUpdate(
    { order: orderId },
    { $set: paymentUpdate },
    { upsert: true, new: true }
  );

  emitOrderUpdated(updatedOrder);
  return updatedOrder;
};

module.exports = {
  createOrder,
  cancelOrder,
  getOrdersByUser,
  getOrderById,
  getAdminOrders,
  getAdminOrderStats,
  getAdminOrderById,
  updateOrderStatus,
  adminCancelOrder,
  recordPayment,
  systemCancelUnpaidOrder,
  cleanupAbandonedOnlineOrders,
  checkTransactionSupport,
};
