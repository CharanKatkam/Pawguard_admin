import axios from "../../api/axios";

export interface LoginPayload {
  email: string;
  password: string;
  device: {
    device_type: string;
  };
}

const login = async (payload: LoginPayload) => {
  const response = await axios.post("/auth/login", payload, {
    headers: {
      "X-Client-Type": "web",
    },
    withCredentials: true,
  });

  return response.data;
};

const authService = {
  login,
};

export default authService;