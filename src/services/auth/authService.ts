import axios from "../../api/axios";
import { notifyAuthChanged } from "../../utils/dataSync";
import { clearAuthData } from "../../utils/authStorage";

export interface LoginPayload {
  email: string;
  password: string;
}

const login = async (payload: LoginPayload) => {
  // Matches exact openapi.json LoginRequest schema
  const requestBody = {
    email: payload.email.trim(),
    password: payload.password,
    device: {
      device_type: "web",
    },
  };

  const response = await axios.post(
    "/auth/login",
    requestBody,
    {
      headers: {
        "X-Client-Type": "web",
      },
    }
  );
  return response;
};

const getMe = async () => {
  const response = await axios.get("/auth/me");
  return response.data;
};

const refreshSession = async () => {
  const response = await axios.post("/auth/refresh");
  return response.data;
};

const logout = async () => {
  try {
    await axios.post("/auth/logout");
  } catch {
    // Ignore network failures on logout
  } finally {
    clearAuthData();
    notifyAuthChanged();
  }
};

/**
 * Request a password reset link for a registered email (public endpoint).
 * Matches PasswordResetRequest schema: { email }
 */
const requestPasswordReset = async (email: string) => {
  const response = await axios.post("/auth/password/reset/request", {
    email: email.trim(),
  });
  return response;
};

/**
 * Set a new password using the token from the reset email (public endpoint).
 * Matches PasswordResetConfirm schema: { token, new_password }
 */
const confirmPasswordReset = async (token: string, newPassword: string) => {
  const response = await axios.post("/auth/password/reset/confirm", {
    token,
    new_password: newPassword,
  });
  return response;
};

const authService = {
  login,
  getMe,
  refreshSession,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
};

export default authService;