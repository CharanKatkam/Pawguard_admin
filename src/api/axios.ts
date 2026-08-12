import axios from "axios";
import { notifyAuthChanged } from "../utils/dataSync";
import { getAccessToken, clearAuthData } from "../utils/authStorage";

// Base API configuration for production and development environment
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  "https://pawguard-backend-mqri.onrender.com/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token if available
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global 401 authorization handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;

      if (status === 401 && window.location.pathname !== "/") {
        clearAuthData();
        notifyAuthChanged();
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;