const mongoose = require("mongoose");
const env = require("./env");

// Global connection event monitoring for production Atlas cluster resilience
let listenersAttached = false;
const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB Runtime Error]:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB Disconnected]: Connection lost. Driver will attempt reconnect...");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("[MongoDB Reconnected]: Successfully reconnected to Atlas replica set.");
  });
};

/**
 * Connect to MongoDB Atlas with production pooling, timeout options, and failover listeners.
 * Throws on failure to allow caller (e.g. server.js or test suites) to handle cleanly.
 */
const connectDB = async (customUri = null) => {
  const uri = customUri !== null && customUri !== undefined ? customUri : env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI (or MONGODB_URI) is not defined in environment variables.");
  }

  attachConnectionListeners();

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 50,
    minPoolSize: 5,
  };

  try {
    const connection = await mongoose.connect(uri, options);
    console.log(`MongoDB connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    // Resilient fallback for environments where local DNS has trouble resolving Atlas SRV records
    if (error.message && error.message.includes("querySrv")) {
      try {
        const dns = require("dns");
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
        const connection = await mongoose.connect(uri, options);
        console.log(`MongoDB connected: ${connection.connection.host}`);
        return connection;
      } catch (retryErr) {
        // Fall through to error rethrow below
      }
    }

    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

module.exports = connectDB;
