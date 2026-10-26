import api from "./api";

const TOKEN_KEY = "student_token";
const USER_KEY = "student_user";

/**
 * Check if a JWT token is expired by decoding its payload.
 */
const isTokenExpired = (token) => {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload || !payload.exp) return false;
    // exp is in seconds; check if current time is >= expiration time
    return Date.now() >= payload.exp * 1000;
  } catch (_) {
    return true;
  }
};

const authService = {
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const token = response.data?.token || response.token;
    const user = response.data?.user || response.user;

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem("token", token);
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    return { token, user };
  },

  register: async (name, email, password) => {
    const response = await api.post("/auth/register", { name, email, password });
    const token = response.data?.token || response.token;
    const user = response.data?.user || response.user;

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem("token", token);
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    return { token, user };
  },

  getMe: async () => {
    const response = await api.get("/auth/me");
    const user = response.data?.user || response.user;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser: () => {
    const token = authService.getToken();
    if (!token) return null;

    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  },

  getToken: () => {
    const token =
      localStorage.getItem(TOKEN_KEY) || localStorage.getItem("token") || null;
    if (!token) return null;

    // Auto-clean expired JWTs
    if (isTokenExpired(token)) {
      authService.logout();
      return null;
    }

    return token;
  },

  isAuthenticated: () => {
    const token = authService.getToken();
    return Boolean(token && typeof token === "string" && token.trim().length > 0);
  },
};

export default authService;
