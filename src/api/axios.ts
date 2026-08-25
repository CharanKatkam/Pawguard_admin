import axios from "axios";
import { notifyAuthChanged } from "../utils/dataSync";
import { clearAuthData, isSessionExpired, updateLastActivity, getStoredUser } from "../utils/authStorage";

// Base API configuration: use relative /api/v1 (Vite dev proxy in local dev, Vercel rewrite proxy in production)
const rawApiUrl = (import.meta.env.VITE_API_BASE_URL as string) || "/api/v1";
const API_BASE_URL = rawApiUrl.startsWith("http") ? "/api/v1" : rawApiUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
  withCredentials: true,
});

// Request Interceptor: Enforce 15-minute session inactivity timeout (browser automatically handles HttpOnly cookies)
api.interceptors.request.use(
  (config) => {
    const user = getStoredUser();
    if (user) {
      if (isSessionExpired()) {
        clearAuthData();
        notifyAuthChanged();
        window.location.href = "/";
        return Promise.reject(new axios.Cancel("Session expired due to 15 minutes of inactivity."));
      }
      updateLastActivity();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response Interceptor: Global 401 authorization & single-retry refresh handler
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (axios.isAxiosError(error) && error.response && originalRequest) {
      const status = error.response.status;

      const publicPaths = ["/", "/reset-password", "/403", "/public-scan", "/scan-pet", "/scan"];
      const isPublicPath = publicPaths.some(
        (p) => window.location.pathname === p || window.location.pathname.startsWith(p + "/")
      );

      const isAuthEndpoint =
        typeof originalRequest.url === "string" &&
        (originalRequest.url.includes("/auth/login") || originalRequest.url.includes("/auth/refresh"));

      if (status === 401 && !isPublicPath && !isAuthEndpoint) {
        if (originalRequest._retry) {
          clearAuthData();
          notifyAuthChanged();
          window.location.href = "/";
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => api(originalRequest))
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Attempt session renewal via backend-controlled HttpOnly cookie refresh
          await api.post("/auth/refresh", {});
          processQueue(null);
          return api(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr);
          clearAuthData();
          notifyAuthChanged();
          window.location.href = "/";
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;