import React, { createContext, useState, useEffect, useCallback, useContext } from "react";
import storeService from "../services/storeService";
import useAuth from "../hooks/useAuth";

export const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [storeStatus, setStoreStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshStoreStatus = useCallback(async () => {
    // Only fetch if admin is authenticated
    if (!isAuthenticated) return null;

    try {
      setLoading(true);
      const data = await storeService.getStoreStatus();
      setStoreStatus(data);
      setError(null);
      return data;
    } catch (err) {
      console.warn("Failed to fetch admin store status:", err.message);
      setError(err.message || "Failed to load store status");
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshStoreStatus();
    } else {
      setStoreStatus(null);
    }
  }, [isAuthenticated, refreshStoreStatus]);

  const value = {
    storeStatus,
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
