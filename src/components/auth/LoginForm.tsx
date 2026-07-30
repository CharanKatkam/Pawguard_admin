import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import PasswordInput from "./PasswordInput";
import authService from "../../services/auth/authService";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await authService.login({
        email,
        password,
        device: {
          device_type: "web",
        },
      });

      const { access_token, refresh_token, user } = response.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("user", JSON.stringify(user));

      navigate("/dashboard");
    } catch (error: unknown) {
      console.log("========== LOGIN ERROR ==========");

      if (axios.isAxiosError(error)) {
        console.log("Status:", error.response?.status);
        console.log("Response Data:", error.response?.data);

        alert(
          error.response?.data?.message ||
            error.response?.data?.detail ||
            "Invalid email or password."
        );
      } else {
        console.error(error);
        alert("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <label>Email Address</label>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Password</label>

        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button
        className="login-button"
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? "Signing In..." : "Sign In"}
      </button>
    </>
  );
};

export default LoginForm;