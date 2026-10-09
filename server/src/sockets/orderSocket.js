const mongoose = require("mongoose");
const Order = require("../models/Order");

/**
 * Handle Order Room Socket Subscriptions & Access Control
 * Private rooms: order:<orderId>
 * Students may only join orders they own.
 * Admins may join any order room or the aggregate admin:orders room.
 */
const orderSocket = (io, socket) => {
  // Join a specific order's private room
  socket.on("order:join", async (data, callback) => {
    try {
      const isAdmin =
        socket.user?.role === "ADMIN" || socket.user?.role === "SUPER_ADMIN";

      // Support batch joining for orders list view
      if (Array.isArray(data?.orderIds)) {
        const validIds = data.orderIds.filter((id) =>
          mongoose.Types.ObjectId.isValid(id)
        );
        if (validIds.length === 0) {
          if (typeof callback === "function") callback({ success: true, joined: [] });
          return;
        }

        const query = isAdmin
          ? { _id: { $in: validIds } }
          : { _id: { $in: validIds }, user: socket.user?._id };

        const matchedOrders = await Order.find(query).select("_id");
        const joinedRooms = [];

        for (const ord of matchedOrders) {
          const roomName = `order:${ord._id.toString()}`;
          socket.join(roomName);
          joinedRooms.push(roomName);
        }

        if (typeof callback === "function") {
          callback({ success: true, joined: joinedRooms });
        }
        return;
      }

      const orderId = typeof data === "string" ? data : data?.orderId;
      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
        const errorMsg = "Invalid order ID";
        if (typeof callback === "function") callback({ success: false, message: errorMsg });
        socket.emit("order:error", { message: errorMsg });
        return;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        const errorMsg = "Order not found";
        if (typeof callback === "function") callback({ success: false, message: errorMsg });
        socket.emit("order:error", { message: errorMsg });
        return;
      }

      // Ownership and Role Authorization
      const isOwner =
        socket.user?._id && order.user.toString() === socket.user._id.toString();

      if (!isAdmin && !isOwner) {
        const errorMsg = "Forbidden: You do not have permission to subscribe to this order";
        if (typeof callback === "function") callback({ success: false, message: errorMsg });
        socket.emit("order:error", { message: errorMsg });
        return;
      }

      const roomName = `order:${orderId}`;
      socket.join(roomName);

      if (typeof callback === "function") {
        callback({ success: true, room: roomName, orderId });
      }
    } catch (err) {
      if (typeof callback === "function") callback({ success: false, message: err.message });
      socket.emit("order:error", { message: err.message });
    }
  });

  // Leave private order room
  socket.on("order:leave", (data, callback) => {
    try {
      if (Array.isArray(data?.orderIds)) {
        for (const id of data.orderIds) {
          socket.leave(`order:${id}`);
        }
        if (typeof callback === "function") callback({ success: true });
        return;
      }

      const orderId = typeof data === "string" ? data : data?.orderId;
      if (orderId) {
        socket.leave(`order:${orderId}`);
      }
      if (typeof callback === "function") callback({ success: true });
    } catch (_) {}
  });

  // Join admin aggregate orders room
  socket.on("admin:join", (data, callback) => {
    if (socket.user?.role === "ADMIN" || socket.user?.role === "SUPER_ADMIN") {
      socket.join("admin:orders");
      if (typeof callback === "function") callback({ success: true, room: "admin:orders" });
    } else {
      if (typeof callback === "function") {
        callback({ success: false, message: "Unauthorized for admin room" });
      }
    }
  });
};

module.exports = orderSocket;
