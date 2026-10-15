const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const orderSocket = require("./orderSocket");

let ioInstance = null;

/**
 * Socket.IO Authentication Middleware
 * Validates JWT token from handshake auth or authorization headers.
 * Does NOT trust client-supplied userId.
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    let token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization;

    if (token && typeof token === "string" && token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return next(new Error("Authentication error: Token missing"));
    }

    const secret = env.JWT_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token.trim(), secret);

    const userId = decoded.id || decoded._id;
    if (!userId) {
      return next(new Error("Authentication error: Invalid token payload"));
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    if (user.isActive === false) {
      return next(new Error("Authentication error: Account is deactivated"));
    }

    socket.user = user;
    next();
  } catch (err) {
    return next(new Error("Authentication error: " + err.message));
  }
};

/**
 * Initialize Socket.IO server attached to HTTP server
 */
const initSocket = (httpServer) => {
  if (ioInstance) return ioInstance;

  const configuredOrigins = (
    env.ALLOWED_ORIGINS || [
      env.CLIENT_URL || "https://canteenbite.pages.dev",
      env.ADMIN_URL || "https://canteenbite-admin.pages.dev",
    ].filter(Boolean)
  ).map((o) => o.replace(/\/+$/, ""));

  const devOrigins =
    env.NODE_ENV !== "production"
      ? [
          "http://localhost:5173",
          "http://localhost:5174",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:5174",
        ]
      : [];
  const allowedOrigins = Array.from(new Set([...configuredOrigins, ...devOrigins]));

  const isAllowedSocketOrigin = (origin) => {
    if (!origin) return true;
    const cleanOrigin = origin.trim().replace(/\/+$/, "");
    if (allowedOrigins.includes(cleanOrigin)) return true;
    if (/^https:\/\/([a-z0-9-]+\.)?canteenbite\.pages\.dev$/.test(cleanOrigin)) return true;
    if (/^https:\/\/([a-z0-9-]+\.)?canteenbite-admin\.pages\.dev$/.test(cleanOrigin)) return true;
    return false;
  };

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedSocketOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Socket CORS violation"));
        }
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  // Attach authentication middleware
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    // Mount order socket handlers
    orderSocket(io, socket);

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });

  ioInstance = io;
  return io;
};

/**
 * Get current Socket.IO instance
 */
const getIO = () => ioInstance;

/**
 * Emit order:updated event to private room order:<orderId> and admin:orders
 * Emitted strictly after successful database commits.
 */
const emitOrderUpdated = (order) => {
  if (!ioInstance || !order) return;

  const orderId = (order._id || order.id).toString();

  const payload = {
    orderId,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    cancellationWindowOpen: order.cancellationWindowOpen,
    cancelUntil: order.cancelUntil,
    cancelledBy: order.cancelledBy || null,
    cancellationReason: order.cancellationReason || null,
    estimatedPreparationTime: order.estimatedPreparationTime || order.estimatedPreparationMinutes || 15,
    estimatedPreparationMinutes: order.estimatedPreparationMinutes || order.estimatedPreparationTime || 15,
    expectedReadyAt: order.expectedReadyAt || order.estimatedReadyAt || null,
    estimatedReadyAt: order.estimatedReadyAt || order.expectedReadyAt || null,
    preparationEstimateUpdatedAt: order.preparationEstimateUpdatedAt || order.updatedAt || null,
    serverTime: new Date().toISOString(),
    preparationStartedAt: order.preparationStartedAt || null,
    readyAt: order.readyAt || null,
    completedAt: order.completedAt || null,
    delayedAt: order.delayedAt || null,
    cancelledAt: order.cancelledAt || null,
    updatedAt: order.updatedAt,
  };

  // 1. Emit to student's private order room
  ioInstance.to(`order:${orderId}`).emit("order:updated", payload);

  // 2. Emit to aggregate admin orders room
  ioInstance.to("admin:orders").emit("order:updated", payload);
};

module.exports = {
  initSocket,
  getIO,
  emitOrderUpdated,
};
