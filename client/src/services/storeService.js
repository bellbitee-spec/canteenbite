import api from "./api";

/**
 * Student Store Service
 * Fetches authoritative store state and weekly schedule from backend.
 * Never calculates store status locally in React.
 */
const storeService = {
  /**
   * GET /api/store/status
   * Returns: { name, isOpen, acceptingOrders, canOrder, reason, currentDay, currentDayName, currentTime, openingTime, closingTime, nextOpeningAt, timezone, ... }
   */
  getStoreStatus: async () => {
    const response = await api.get("/store/status");
    return response.data || response.store || response;
  },

  /**
   * GET /api/store/schedule
   * Returns: 7-day schedule array
   */
  getStoreSchedule: async () => {
    const response = await api.get("/store/schedule");
    const scheduleData = response.data?.schedule || response.schedule || response.data || response;
    return Array.isArray(scheduleData) ? scheduleData : [];
  },
};

export default storeService;
