import axios from "axios";

const api = axios.create({
  baseURL: "https://pawguard-backend-mqri.onrender.com/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;