const rateLimit = require("express-rate-limit");

const isTest = process.env.NODE_ENV === "test";

/**
 * Strict rate limiter for authentication routes (login / register)
 * 20 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 2000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

/**
 * Strict rate limiter for payment transactions and verification
 * 60 requests per 15 minutes per IP
 */
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 2000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many payment operations. Please try again after 15 minutes.",
  },
});

/**
 * General API rate limiter
 * 500 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * Factory for creating custom-scoped rate limiters (e.g. for testing)
 */
const createLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: options.message || "Rate limit exceeded. Please slow down.",
    },
    ...options,
  });
};

module.exports = {
  authLimiter,
  paymentLimiter,
  apiLimiter,
  createLimiter,
};
