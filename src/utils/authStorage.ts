/**
 * Centralized auth storage.
 *
 * - Default (Remember Me OFF): tokens live in sessionStorage and are cleared
 *   when the browser tab/window closes.
 * - Remember Me ON: tokens live in localStorage and survive browser restarts.
 * - Reads check sessionStorage first so a fresh session always wins over a
 *   stale persistent login.
 * - Passwords are NEVER stored.
 */

export const AUTH_STORAGE_KEYS = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  user: "user",
  rememberMe: "remember_me",
  rememberEmail: "remember_email",
  lastActivity: "last_activity",
} as const;

/** Exact 300 seconds (5 minutes) session inactivity timeout. */
export const SESSION_TIMEOUT_MS = 300 * 1000;

const read = (key: string): string | null => {
  try {
    const session = sessionStorage.getItem(key);
    if (session !== null) return session;
  } catch {
    /* storage unavailable; ignore */
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string): void => {
  const persistent = getRememberMe();
  try {
    if (persistent) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
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

export const getAccessToken = (): string | null => read(AUTH_STORAGE_KEYS.accessToken);

export const getRefreshToken = (): string | null => read(AUTH_STORAGE_KEYS.refreshToken);

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
  const token = getAccessToken();
  if (!token) return false;

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

export interface AuthData {
  accessToken: string;
  refreshToken?: string | null;
  user: unknown;
}

/**
 * Persist the authenticated session. The `rememberMe` flag controls the target
 * storage (localStorage vs sessionStorage) and is persisted as a preference so
 * the login form can restore the checkbox on the next visit.
 */
export const setAuthData = (data: AuthData, rememberMe: boolean): void => {
  setRememberMe(rememberMe);
  write(AUTH_STORAGE_KEYS.accessToken, data.accessToken);
  if (data.refreshToken) {
    write(AUTH_STORAGE_KEYS.refreshToken, data.refreshToken);
  } else {
    remove(AUTH_STORAGE_KEYS.refreshToken);
  }
  write(AUTH_STORAGE_KEYS.user, JSON.stringify(data.user));
  updateLastActivity();
};

/** Remove credentials from BOTH storages (leaves remember-email preference). */
export const clearAuthData = (): void => {
  remove(AUTH_STORAGE_KEYS.accessToken);
  remove(AUTH_STORAGE_KEYS.refreshToken);
  remove(AUTH_STORAGE_KEYS.user);
  remove(AUTH_STORAGE_KEYS.lastActivity);
};
