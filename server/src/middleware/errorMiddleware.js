const logger = require("../utils/logger");

/**
 * Global Production-Hardened Error Handling Middleware
 * Suppresses internal stack traces and driver details in production,
 * provides standardized error responses across the API.
 */
const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid resource identifier: ${err.value}`;
  }

  // Mongoose ValidationError
  if (err.name === "ValidationError") {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(". ");
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate key conflict detected";
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token signature";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token has expired";
  }

  // Log 500 errors for internal auditing
  if (statusCode >= 500) {
    logger.error(`[SERVER_ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  // Hide 500 details in production
  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "Internal server error";
  }

  const responseBody = {
    success: false,
    message,
  };

  // Only include debug stack trace in development
  if (process.env.NODE_ENV === "development" && statusCode === 500) {
    responseBody.stack = err.stack;
  }

  return res.status(statusCode).json(responseBody);
};

module.exports = errorMiddleware;
