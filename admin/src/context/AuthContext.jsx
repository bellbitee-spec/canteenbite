import React, { createContext, useState, useEffect, useCallback } from "react";
import authService from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const initAuth = useCallback(async () => {
    const token = authService.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await authService.getMe();
      if (
        profile &&
        (profile.role === "ADMIN" || profile.role === "SUPER_ADMIN")
      ) {
        setUser(profile);
      } else {
        authService.logout();
        setUser(null);
      }
    } catch (_) {
      authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (email, password) => {
    const { user: loggedInUser } = await authService.login(email, password);
    if (
      !loggedInUser ||
      (loggedInUser.role !== "ADMIN" && loggedInUser.role !== "SUPER_ADMIN")
    ) {
      authService.logout();
      setUser(null);
      throw new Error(
        "Access denied: You do not have administrative privileges"
      );
    }
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const profile = await authService.getMe();
      if (
        profile &&
        (profile.role === "ADMIN" || profile.role === "SUPER_ADMIN")
      ) {
        setUser(profile);
        return profile;
      }
      logout();
      return null;
    } catch (_) {
      logout();
      return null;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(
      user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")
    ),
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
