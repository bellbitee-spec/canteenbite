import api, { TOKEN_KEY } from "./api";

const USER_KEY = "admin_user";

const authService = {
  /**
   * Log in admin user
   * Endpoint: POST /api/auth/login
   */
  async login(email, password) {
    const response = await api.post("/auth/login", {
      email: email.trim(),
      password,
    });

    if (response && response.success && response.data) {
      const { token, user } = response.data;
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      return { user, token };
    }

    throw new Error(response?.message || "Login failed");
  },

  /**
   * Fetch current authenticated admin profile
   * Endpoint: GET /api/auth/me
   */
  async getMe() {
    const token = this.getToken();
    if (!token) {
      throw new Error("No token available");
    }

    try {
      const response = await api.get("/auth/me");
      if (response && response.success && response.data?.user) {
        const user = response.data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
      }
      throw new Error("Failed to load user profile");
    } catch (err) {
      this.logout();
      throw err;
    }
  },

  /**
   * Log out admin (client-side)
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Retrieve stored admin token
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Retrieve cached admin user object
   */
  getStoredUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  },

  /**
   * Check if token exists in localStorage
   */
  isAuthenticated() {
    return Boolean(this.getToken());
  },
};

export default authService;
