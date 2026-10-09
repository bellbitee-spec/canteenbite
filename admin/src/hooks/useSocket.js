import { useEffect, useState } from "react";
import { getSocket, connectSocket, disconnectSocket } from "../services/socket";
import useAuth from "./useAuth";

export { default as useOrderSocket } from "./useOrderSocket";

const useSocket = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      setConnected(false);
      return;
    }

    const socket = getSocket() || connectSocket();
    if (!socket) return;

    setConnected(socket.connected);

    const onConnect = () => {
      setConnected(true);
      socket.emit("admin:join");
    };

    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [user]);

  return {
    socket: getSocket(),
    connected,
    connectSocket,
    disconnectSocket,
  };
};

export default useSocket;
