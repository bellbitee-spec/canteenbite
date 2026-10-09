const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

export const request = async (endpoint, options = {}) => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const baseUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const url = `${baseUrl}/${cleanEndpoint}`;

  // Automatically attach Authorization token if student is logged in
  let authHeader = {};
  if (typeof window !== "undefined" && window.localStorage) {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("student_token") ||
      localStorage.getItem("auth_token");
    if (token && typeof token === "string" && token.trim().length > 0) {
      authHeader = { Authorization: `Bearer ${token.trim()}` };
    }
  }

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers,
    },
    ...options,
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
