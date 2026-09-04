import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,

  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("mulaqat_token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    // ========================================
    // FORM DATA
    // ========================================

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

export default api;