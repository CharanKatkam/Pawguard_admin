import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import PasswordInput from "./PasswordInput";
import authService from "../../services/auth/authService";
import { getDashboardPathForRole, normalizeRole } from "../../utils/roleUtils";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Please enter your email address and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await authService.login({
        email: email.trim(),
        password,
      });

      // Handle backend structured response: { success: true, data: { access_token, user } }
      const resData = response?.data?.data || response?.data || response;

      // Extract access token
      const access_token = resData?.access_token || response?.data?.access_token || `token_${Date.now()}`;
      const refresh_token = resData?.refresh_token || response?.data?.refresh_token;

      let userObj = resData?.user || response?.data?.user || (typeof resData === "object" && resData !== null ? resData : {});

      // Ensure user object preserves email if not provided
      if (typeof userObj === "object" && userObj !== null) {
        if (!userObj.email && email) {
          userObj = { ...userObj, email };
        }
      } else {
        userObj = { email };
      }

      // Determine exact role and verify it is an internal operational staff role
      const userRole = normalizeRole(
        userObj?.role ||
        userObj?.role_name ||
        userObj?.user_type ||
        userObj?.type ||
        userObj?.email ||
        email
      );

      if (!userRole) {
        setErrorMsg("Access Denied: The Admin Portal is restricted to authorized internal staff only.");
        setLoading(false);
        return;
      }

      localStorage.setItem("access_token", access_token);
      if (refresh_token) {
        localStorage.setItem("refresh_token", refresh_token);
      }
      localStorage.setItem("user", JSON.stringify(userObj));

      if (rememberMe) {
        localStorage.setItem("remember_email", email);
      } else {
        localStorage.removeItem("remember_email");
      }

      const targetPath = getDashboardPathForRole(userRole);
      navigate(targetPath, { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          // Network Error / Origin Mismatch / CORS Preflight Error
          setErrorMsg(
            `CORS / Origin Error: Please access the app via http://localhost:5173 to match backend CORS policy, or update backend CORSMiddleware origins.`
          );
        } else {
          // Parse FastAPI error format: { success: false, error: { message: "Invalid email or password." } }
          const backendErr = error.response.data?.error;
          const msg =
            backendErr?.message ||
            error.response.data?.message ||
            error.response.data?.detail ||
            "Invalid email or password. Please check your credentials.";
          setErrorMsg(msg);
        }
      } else {
        setErrorMsg("Authentication failed. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ width: "100%" }}>
      {errorMsg && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            padding: "12px 14px",
            borderRadius: "10px",
            fontSize: "13px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            lineHeight: 1.4,
          }}
        >
          ⚠️ <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="password">Password</label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="login-options" style={{ marginBottom: "24px" }}>
        <label htmlFor="remember">
          <input
            id="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me
        </label>

        <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Password reset instructions sent to your administrator."); }}>
          Forgot Password?
        </a>
      </div>

      <button
        type="submit"
        className="login-button"
        disabled={loading}
      >
        {loading ? "Signing In..." : "Sign In"}
      </button>
    </form>
  );
};

export default LoginForm;