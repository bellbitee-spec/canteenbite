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

    return () => {
      socket.off("order:updated", handleOrderUpdated);
      socket.off("connect", handleConnect);
    };
  }, [user, enabled]);
};

export default useOrderSocket;
