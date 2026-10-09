import { io } from "socket.io-client";

const resolveSocketUrl = () => {
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (envSocketUrl && typeof envSocketUrl === "string" && envSocketUrl.trim()) {
    return envSocketUrl.trim().replace(/\/+$/, "");
  }

  const envApiUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL;

  if (envApiUrl && typeof envApiUrl === "string" && envApiUrl.trim()) {
    return envApiUrl.trim().replace(/\/+$/, "").replace(/\/api\/?$/, "");
  }

  // In production builds, default to deployed Render backend root
  if (import.meta.env.PROD) {
    return "https://canteenbite.onrender.com";
  }

  // Local development default
  return "http://localhost:5000";
};

const SOCKET_URL = resolveSocketUrl();

let socketInstance = null;

const getAuthToken = () => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return (
    localStorage.getItem("admin_token") ||
    localStorage.getItem("token")
  );
};

/**
 * Connect to Socket.IO server with admin JWT authentication
 */
export const connectSocket = (providedToken = null) => {
  const token = providedToken || getAuthToken();

  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  if (socketInstance) {
    if (token) {
      socketInstance.auth = { token };
      socketInstance.connect();
    }
    return socketInstance;
  }

  if (!token) {
    return null;
  }

  socketInstance = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 25,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socketInstance.on("connect", () => {
    // Automatically join the admin aggregate orders room
    socketInstance.emit("admin:join");
  });

  socketInstance.on("connect_error", (err) => {
    if (import.meta.env.DEV) {
      console.warn("[Admin Socket Warning] Connection error:", err.message);
    }
  });

  return socketInstance;
};

/**
 * Disconnect socket and cleanup instance
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
};

/**
 * Retrieve current socket instance (or connect if authenticated)
 */
export const getSocket = () => {
  if (!socketInstance) {
    return connectSocket();
  }
  return socketInstance;
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
};
