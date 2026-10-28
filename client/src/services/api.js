const resolveApiBaseUrl = () => {
  const envUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL;

  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }

  // In production builds, default to the deployed Render backend
  if (import.meta.env.PROD) {
    return "https://canteenbite.onrender.com/api";
  }

  // Local development default
  return "http://localhost:5000/api";
};

const API_BASE_URL = resolveApiBaseUrl();

export const request = async (endpoint, options = {}) => {
  let cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  // Guard against duplicate /api prefix if passed by caller
  if (cleanEndpoint.startsWith("api/")) {
    cleanEndpoint = cleanEndpoint.slice(4);
  }

  const baseUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const url = `${baseUrl}/${cleanEndpoint}`;

  // Automatically attach Authorization token if student is logged in
  let authHeader = {};
  if (typeof window !== "undefined" && window.localStorage) {
    const token =
      localStorage.getItem("student_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token");
    if (token && typeof token === "string" && token.trim().length > 0) {
      authHeader = { Authorization: `Bearer ${token.trim()}` };
    }
  }

  const { headers: customHeaders, ...restOptions } = options;

  const config = {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(customHeaders || {}),
    },
  };

  try {
    const response = await fetch(url, config);

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Auto-clear invalid/expired sessions on 401 Unauthorized
      if (response.status === 401) {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.removeItem("token");
          localStorage.removeItem("student_token");
          localStorage.removeItem("student_user");
          localStorage.removeItem("auth_token");
          window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        }
      }

      const errorMessage =
        (data && typeof data === "object" && (data.message || data.error)) ||
        (typeof data === "string" && data) ||
        `Request failed with status ${response.status}`;

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      const networkError = new Error(
        error.message || "Unable to connect to canteen server."
      );
      networkError.status = 0;
      throw networkError;
    }
    throw error;
  }
};

const api = {
  get: (endpoint, options = {}) =>
    request(endpoint, { method: "GET", ...options }),
  post: (endpoint, body, options = {}) =>
    request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),
  patch: (endpoint, body, options = {}) =>
    request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
      ...options,
    }),
  delete: (endpoint, options = {}) =>
    request(endpoint, { method: "DELETE", ...options }),
};

export default api;
