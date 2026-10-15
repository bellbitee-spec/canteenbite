import { useEffect, useRef } from "react";
import useAuth from "./useAuth";
import { getSocket, connectSocket } from "../services/socket";

/**
 * useOrderSocket
 * Custom hook for subscribing to realtime order events via Socket.IO
 * Automatically joins/leaves private order room order:<orderId>
 * Supports single order tracking (orderId) or multiple order list tracking (orderIds)
 * Handles reconnects and triggers onReconnect / onOrderUpdated callbacks.
 */
export const useOrderSocket = ({
  orderId,
  orderIds,
  onOrderUpdated,
  onReconnect,
  enabled = true,
}) => {
  const { isAuthenticated, token } = useAuth();

  const onOrderUpdatedRef = useRef(onOrderUpdated);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onOrderUpdatedRef.current = onOrderUpdated;
    onReconnectRef.current = onReconnect;
  }, [onOrderUpdated, onReconnect]);

  const orderIdsKey = Array.isArray(orderIds) ? orderIds.join(",") : "";

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }

    const socket = getSocket() || connectSocket(token);
    if (!socket) {
      return;
    }

    // 1. Join Order Room(s)
    if (orderId) {
      socket.emit("order:join", { orderId });
    } else if (Array.isArray(orderIds) && orderIds.length > 0) {
      socket.emit("order:join", { orderIds });
    }

    // 2. Handle order:updated event
    const handleOrderUpdated = (eventData) => {
      if (!eventData || !eventData.orderId) return;

      // If single orderId specified, filter strictly
      if (orderId && eventData.orderId.toString() !== orderId.toString()) {
        return;
      }

      // If multiple orderIds specified, filter to membership
      if (Array.isArray(orderIds) && orderIds.length > 0) {
        const belongs = orderIds.some(
          (id) => id?.toString() === eventData.orderId.toString()
        );
        if (!belongs) return;
      }

      if (typeof onOrderUpdatedRef.current === "function") {
        onOrderUpdatedRef.current(eventData);
      }
    };

    // 3. Handle reconnection: Re-join room & refetch authoritative state
    const handleConnect = () => {
      if (orderId) {
        socket.emit("order:join", { orderId });
      } else if (Array.isArray(orderIds) && orderIds.length > 0) {
        socket.emit("order:join", { orderIds });
      }

      if (typeof onReconnectRef.current === "function") {
        onReconnectRef.current();
      }
    };

    socket.on("order:updated", handleOrderUpdated);
    socket.on("connect", handleConnect);

    // 4. Safe polling fallback when socket is disconnected or unavailable
    let fallbackInterval = null;
    const startPolling = () => {
      if (!fallbackInterval) {
        fallbackInterval = setInterval(() => {
          if (!socket.connected && typeof onReconnectRef.current === "function") {
            onReconnectRef.current();
          }
        }, 8000);
      }
    };

    const stopPolling = () => {
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    const handleDisconnect = () => {
      startPolling();
    };

    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleDisconnect);
    socket.on("connect", stopPolling);

    if (!socket.connected) {
      startPolling();
    }

    // 5. Cleanup on unmount or id changes
    return () => {
      stopPolling();
      if (orderId) {
        socket.emit("order:leave", { orderId });
      } else if (Array.isArray(orderIds) && orderIds.length > 0) {
        socket.emit("order:leave", { orderIds });
      }
      socket.off("order:updated", handleOrderUpdated);
      socket.off("connect", handleConnect);
      socket.off("connect", stopPolling);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleDisconnect);
    };
  }, [orderId, orderIdsKey, isAuthenticated, token, enabled]);
};

export default useOrderSocket;
