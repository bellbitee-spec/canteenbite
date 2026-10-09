const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimitMiddleware");
const {
  registerValidator,
  loginValidator,
} = require("../validators/authValidators");

router.post("/register", authLimiter, registerValidator, authController.register);
router.post("/login", authLimiter, loginValidator, authController.login);
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
