const express = require("express");
const router = express.Router();
const storeController = require("../controllers/storeController");

// GET /api/store/status - Get current store open/closed and ordering status
router.get("/status", storeController.getPublicStoreStatus);

// GET /api/store/schedule - Get weekly schedule (public view)
router.get("/schedule", storeController.getAdminSchedule);

module.exports = router;
