import api from "./api";

const TOKEN_KEY = "student_token";
const USER_KEY = "student_user";

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

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  },

  getToken: () => {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem("token") || null;
  },

  isAuthenticated: () => {
    const token = authService.getToken();
    return Boolean(token && typeof token === "string" && token.trim().length > 0);
  },
};

export default authService;
