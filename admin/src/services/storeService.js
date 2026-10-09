import api from "./api";

/**
 * Admin Store Service
 * Manages weekly schedules, manual overrides, accepting orders, and store settings.
 */
const storeService = {
  /**
   * GET /api/admin/store/status
   * Authoritative store status from admin perspective
   */
  getStoreStatus: async () => {
    const response = await api.get("/admin/store/status");
    return response.data || response.store || response;
  },

  /**
   * GET /api/admin/store/schedule
   * 7-day schedule array
   */
  getSchedule: async () => {
    const response = await api.get("/admin/store/schedule");
    const list = response.data?.schedule || response.schedule || response.data || response;
    return Array.isArray(list) ? list : [];
  },

  /**
   * PATCH /api/admin/store/schedule
   * Updates weekly operating hours
   * @param {Array} entries - [{ dayOfWeek, isOpen, openingTime, closingTime }]
   */
  updateSchedule: async (entries) => {
    const response = await api.patch("/admin/store/schedule", { entries });
    const list = response.data?.schedule || response.schedule || response.data || response;
    return Array.isArray(list) ? list : [];
  },

  /**
   * GET /api/admin/store/settings
   * Store settings (storeName, manualOverride, isOpen, acceptingOrders, etc.)
   */
  getSettings: async () => {
    const response = await api.get("/admin/store/settings");
    return response.data?.settings || response.settings || response.data || response;
  },

  /**
   * PATCH /api/admin/store/settings
   * Updates store configuration
   * @param {Object} updates
   */
  updateSettings: async (updates) => {
    const response = await api.patch("/admin/store/settings", updates);
    return response.data?.settings || response.settings || response.data || response;
  },
};

export default storeService;
