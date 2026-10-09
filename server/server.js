const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const env = require("./src/config/env");
const { initSocket } = require("./src/sockets");
const { cleanupAbandonedOnlineOrders } = require("./src/services/orderService");

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    initSocket(server);

    // Initial check and periodic cleanup of abandoned online orders (every 5 minutes)
    cleanupAbandonedOnlineOrders(15).catch(() => {});
    const cleanupInterval = setInterval(() => {
      cleanupAbandonedOnlineOrders(15).catch((err) => {
        console.error("[Abandoned Order Cleanup Error]:", err.message);
      });
    }, 5 * 60 * 1000);

    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }

    server.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
