import React, { createContext, useState, useEffect, useCallback, useContext } from "react";
import authService from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  // Listen for unauthorized events (e.g. from api.js 401s) and cross-tab storage changes
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    const handleStorageChange = (e) => {
      if (
        !e.key ||
        e.key === "student_token" ||
        e.key === "student_user" ||
        e.key === "token"
      ) {
        setUser(authService.getCurrentUser());
        setToken(authService.getToken());
      }
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    window.addEventListener("storage", handleStorageChange);

    // Initial background token validation if token exists
    const currentToken = authService.getToken();
    if (currentToken) {
      authService
        .getMe()
        .then((freshUser) => {
          if (freshUser) {
            setUser(freshUser);
          }
        })
        .catch((err) => {
          if (err.status === 401) {
            logout();
          }
        });
    }

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [logout]);

  const isAuthenticated = Boolean(token && user);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      setUser(result.user);
      setToken(result.token);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const result = await authService.register(name, email, password);
      setUser(result.user);
      setToken(result.token);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
