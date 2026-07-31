import axios from "../../api/axios";

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

  const response = await axios.post("/auth/login", requestBody);
  return response;
};

const getMe = async () => {
  const response = await axios.get("/auth/me");
  return response.data;
};

const logout = async () => {
  try {
    await axios.post("/auth/logout");
  } catch {
    // Ignore network failures on logout
  } finally {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  }
};

const authService = {
  login,
  getMe,
  logout,
};

export default authService;