import { useEffect, useRef } from "react";
import useAuth from "./useAuth";
import { getSocket, connectSocket } from "../services/socket";

/**
 * useOrderSocket
 * Hook for subscribing admin to realtime order events via Socket.IO
 * Automatically joins the admin:orders room
 * Invokes onOrderUpdated on order:updated events
 * Invokes onReconnect on socket reconnection to trigger fresh state fetches
 */
export const useOrderSocket = ({
  onOrderUpdated,
  onReconnect,
  enabled = true,
}) => {
  const { user } = useAuth();
  const onOrderUpdatedRef = useRef(onOrderUpdated);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onOrderUpdatedRef.current = onOrderUpdated;
    onReconnectRef.current = onReconnect;
  }, [onOrderUpdated, onReconnect]);

  useEffect(() => {
    if (!enabled || !user) {
      return;
    }

    const socket = getSocket() || connectSocket();
    if (!socket) {
      return;
    }

    // Join admin aggregate orders room
    socket.emit("admin:join");

    const handleOrderUpdated = (eventData) => {
      if (!eventData || !eventData.orderId) return;
      if (typeof onOrderUpdatedRef.current === "function") {
        onOrderUpdatedRef.current(eventData);
      }
    };

    const handleConnect = () => {
      socket.emit("admin:join");
      if (typeof onReconnectRef.current === "function") {
        onReconnectRef.current();
      }
    };

    socket.on("order:updated", handleOrderUpdated);
    socket.on("connect", handleConnect);

    // Safe polling fallback when socket is disconnected or unavailable
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

    return () => {
      stopPolling();
      socket.off("order:updated", handleOrderUpdated);
      socket.off("connect", handleConnect);
      socket.off("connect", stopPolling);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleDisconnect);
    };
  }, [user, enabled]);
};

export default useOrderSocket;
