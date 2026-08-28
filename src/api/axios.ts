import axios from "axios";
import { notifyAuthChanged } from "../utils/dataSync";
import { clearAuthData, isSessionExpired, updateLastActivity, getStoredUser, getAccessToken } from "../utils/authStorage";

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

// Request Interceptor: Attach Bearer token and enforce 15-minute session inactivity timeout
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      if (typeof config.headers.set === "function") {
        config.headers.set("Authorization", `Bearer ${token}`);
      } else {
        (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }
    }

    const isAuthEndpoint =
      typeof config.url === "string" &&
      (config.url.includes("/auth/login") || config.url.includes("/auth/register"));

    if (!isAuthEndpoint) {
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
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global response handler (rejects errors to caller without wiping user session)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;