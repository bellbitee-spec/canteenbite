const storeService = require("../services/storeService");

/**
 * GET /api/store/status
 * Public endpoint: Get current store status (open/closed, canOrder, timings, etc.)
 */
const getPublicStoreStatus = async (req, res) => {
  try {
    const status = await storeService.getCurrentStoreStatus();

    return res.status(200).json({
      success: true,
      message: "Store status retrieved successfully",
      data: status,
      store: status,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * GET /api/admin/store/status
 * Admin endpoint: Get current store status
 */
const getAdminStoreStatus = async (req, res) => {
  try {
    const status = await storeService.getCurrentStoreStatus();

    return res.status(200).json({
      success: true,
      message: "Store status retrieved successfully",
      data: status,
      store: status,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * GET /api/admin/store/schedule
 * Admin endpoint: Get 7-day weekly schedule
 */
const getAdminSchedule = async (req, res) => {
  try {
    const schedule = await storeService.getWeeklySchedule();

    return res.status(200).json({
      success: true,
      message: "Weekly schedule retrieved successfully",
      data: {
        schedule,
      },
      schedule,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * PATCH /api/admin/store/schedule
 * Admin endpoint: Update weekly schedule entries
 */
const updateAdminSchedule = async (req, res) => {
  try {
    const entries = req.body.entries || req.body;
    const updatedSchedule = await storeService.updateWeeklySchedule(entries);

    return res.status(200).json({
      success: true,
      message: "Weekly schedule updated successfully",
      data: {
        schedule: updatedSchedule,
      },
      schedule: updatedSchedule,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * GET /api/admin/store/settings
 * Admin endpoint: Get store settings
 */
const getAdminSettings = async (req, res) => {
  try {
    const settings = await storeService.getOrCreateSettings();

    return res.status(200).json({
      success: true,
      message: "Store settings retrieved successfully",
      data: {
        settings,
      },
      settings,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * PATCH /api/admin/store/settings
 * Admin endpoint: Update store settings (manualOverride, isOpen, acceptingOrders, etc.)
 */
const updateAdminSettings = async (req, res) => {
  try {
    const updatedSettings = await storeService.updateStoreSettings(req.body);

    return res.status(200).json({
      success: true,
      message: "Store settings updated successfully",
      data: {
        settings: updatedSettings,
      },
      settings: updatedSettings,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 ? "Internal server error" : error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

module.exports = {
  getPublicStoreStatus,
  getAdminStoreStatus,
  getAdminSchedule,
  updateAdminSchedule,
  getAdminSettings,
  updateAdminSettings,
};
