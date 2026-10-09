import React, { createContext, useState, useEffect, useCallback, useContext } from "react";
import storeService from "../services/storeService";

export const StoreContext = createContext(null);

/**
 * Safe fallback state when backend status is unavailable or during network errors.
 * Ensures ordering is disabled and students are not misled with a false "Open" status.
 */
const SAFE_OFFLINE_STORE = {
  name: "College Canteen",
  isOpen: false,
  acceptingOrders: false,
  canOrder: false,
  reason: "Unable to verify canteen status. Ordering is temporarily disabled.",
  currentDay: null,
  currentDayName: null,
  currentTime: null,
  openingTime: null,
  closingTime: null,
  nextOpeningAt: null,
  timezone: "Asia/Kolkata",
  manualOverride: false,
  defaultPreparationTime: 10,
  currency: "INR",
};

export const StoreProvider = ({ children }) => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshStoreStatus = useCallback(async () => {
    try {
      const data = await storeService.getStoreStatus();
      setStore(data);
      setError(null);
      return data;
    } catch (err) {
      console.warn("Could not fetch store status:", err.message);
      setError(err.message || "Unable to reach store server");
      // In error state, default to safe offline state so ordering is securely locked
      setStore((prev) => prev ? { ...prev, canOrder: false, reason: "Unable to verify store status." } : SAFE_OFFLINE_STORE);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStoreStatus();
  }, [refreshStoreStatus]);

  // Active store object (fallbacks to SAFE_OFFLINE_STORE if store is null and not loading)
  const activeStore = store || (!loading ? SAFE_OFFLINE_STORE : null);

  const value = {
    store: activeStore,
    loading,
    error,
    refreshStoreStatus,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};

export default StoreContext;
