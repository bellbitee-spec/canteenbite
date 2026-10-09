const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const allowedRoles = ["ADMIN", "SUPER_ADMIN"];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Access restricted to administrators",
    });
  }

  next();
};

module.exports = adminMiddleware;
