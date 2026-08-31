/**
 * Centralized auth storage supporting Secure HttpOnly Cookie authentication.
 *
 * - HttpOnly cookies are automatically sent by the browser on cross-origin API requests.
 * - Raw JWT access/refresh tokens are NOT stored in localStorage or sessionStorage.
 * - User session metadata (`user`), preferences (`remember_me`, `remember_email`), and
 *   session inactivity timestamp (`last_activity`) are persisted for UI role context.
 */

export const AUTH_STORAGE_KEYS = {
  user: "user",
  rememberMe: "remember_me",
  rememberEmail: "remember_email",
  lastActivity: "last_activity",
  accessToken: "access_token",
  refreshToken: "refresh_token",
} as const;

/** Exact 900 seconds (15 minutes) session inactivity timeout. */
export const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

const read = (key: string): string | null => {
  try {
    const session = sessionStorage.getItem(key);
    if (session && session !== "null" && session !== "undefined") return session;
  } catch {
    /* storage unavailable; ignore */
  }
  try {
    const local = localStorage.getItem(key);
    if (local && local !== "null" && local !== "undefined") return local;
  } catch {
    /* storage unavailable; ignore */
  }
  return null;
};

const write = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable; ignore */
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable; ignore */
  }
};

const remove = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable; ignore */
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* storage unavailable; ignore */
  }
};

export const updateLastActivity = (): void => {
  const nowStr = Date.now().toString();
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEYS.lastActivity, nowStr);
  } catch {
    /* storage unavailable; ignore */
  }
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.lastActivity, nowStr);
  } catch {
    /* storage unavailable; ignore */
  }
};

export const getLastActivity = (): number | null => {
  const raw = read(AUTH_STORAGE_KEYS.lastActivity);
  if (!raw) return null;
  const num = parseInt(raw, 10);
  return isNaN(num) ? null : num;
};

export const isSessionExpired = (): boolean => {
  const user = getStoredUser();
  if (!user) return false;

  const lastActivity = getLastActivity();
  if (!lastActivity) {
    updateLastActivity();
    return false;
  }

  return Date.now() - lastActivity >= SESSION_TIMEOUT_MS;
};

export const getStoredUser = <T = unknown>(): T | null => {
  const raw = read(AUTH_STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/** Whether "Remember Me" was previously enabled by the user. */
export const getRememberMe = (): boolean => {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEYS.rememberMe) === "true";
  } catch {
    return false;
  }
};

export const setRememberMe = (value: boolean): void => {
  try {
    if (value) {
      localStorage.setItem(AUTH_STORAGE_KEYS.rememberMe, "true");
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.rememberMe);
    }
  } catch {
    /* storage unavailable; ignore */
  }
};

/** Email remembered for convenience on the login form (not a credential). */
export const getRememberedEmail = (): string => {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEYS.rememberEmail) ?? "";
  } catch {
    return "";
  }
};

export const setRememberedEmail = (email: string): void => {
  try {
    if (email) {
      localStorage.setItem(AUTH_STORAGE_KEYS.rememberEmail, email);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.rememberEmail);
    }
  } catch {
    /* storage unavailable; ignore */
  }
};

export const getAccessToken = (): string | null => {
  let raw: string | null =
    read(AUTH_STORAGE_KEYS.accessToken) ||
    read("token") ||
    read("accessToken") ||
    read("access_token") ||
    read("auth_token");

  if (!raw) {
    const user = getStoredUser<Record<string, unknown>>();
    if (user && typeof user === "object") {
      if (typeof user.access_token === "string" && user.access_token) raw = user.access_token;
      else if (typeof user.token === "string" && user.token) raw = user.token;
      else if (typeof user.accessToken === "string" && user.accessToken) raw = user.accessToken;
    }
  }

  if (!raw) return null;

  const clean = raw.trim().replace(/^["']|["']$/g, "").trim();
  return clean || null;
};

export const getRefreshToken = (): string | null => {
  return read(AUTH_STORAGE_KEYS.refreshToken) || read("refresh_token") || read("refreshToken");
};

export interface AuthData {
  user: unknown;
  access_token?: string;
  refresh_token?: string;
}

/**
 * Persist user session metadata required for UI role context.
 */
export const setAuthData = (data: AuthData, rememberMe: boolean): void => {
  setRememberMe(rememberMe);

  if (data.user) {
    write(AUTH_STORAGE_KEYS.user, JSON.stringify(data.user));
  }
  if (data.access_token) {
    write(AUTH_STORAGE_KEYS.accessToken, data.access_token);
  }
  if (data.refresh_token) {
    write(AUTH_STORAGE_KEYS.refreshToken, data.refresh_token);
  }
  updateLastActivity();
};

/** Remove session user metadata from BOTH storages (leaves remember-email preference). */
export const clearAuthData = (): void => {
  remove(AUTH_STORAGE_KEYS.user);
  remove(AUTH_STORAGE_KEYS.lastActivity);
  remove(AUTH_STORAGE_KEYS.accessToken);
  remove(AUTH_STORAGE_KEYS.refreshToken);
};

