import axios from "axios";
import { notifyAuthChanged } from "../utils/dataSync";
import { clearAuthData, isSessionExpired, updateLastActivity, getStoredUser } from "../utils/authStorage";

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
  withCredentials: true,
});

// Request Interceptor: Enforce 300s session inactivity timeout for active user sessions
api.interceptors.request.use(
  (config) => {
    const user = getStoredUser();
    if (user) {
      if (isSessionExpired()) {
        clearAuthData();
        notifyAuthChanged();
        window.location.href = "/";
        return Promise.reject(new axios.Cancel("Session expired due to 300 seconds of inactivity."));
      }
      updateLastActivity();
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

      const publicPaths = ["/", "/reset-password", "/403", "/public-scan", "/scan-pet", "/scan"];
      const isPublicPath = publicPaths.some(
        (p) => window.location.pathname === p || window.location.pathname.startsWith(p + "/")
      );

      if (status === 401 && !isPublicPath) {
        clearAuthData();
        notifyAuthChanged();
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;