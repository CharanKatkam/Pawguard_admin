import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import PasswordInput from "./PasswordInput";
import ForgotPasswordModal from "./ForgotPasswordModal";
import authService from "../../services/auth/authService";
import { getDashboardPathForRole, normalizeRole } from "../../utils/roleUtils";
import { notifyAuthChanged } from "../../utils/dataSync";
import { getRememberMe, getRememberedEmail, setAuthData, setRememberedEmail } from "../../utils/authStorage";

const LoginForm = () => {
  const [email, setEmail] = useState<string>(() => getRememberedEmail());
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState<boolean>(() => getRememberMe());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const navigate = useNavigate();

  const resolveUserObject = (payload: unknown): any => {
    if (!payload || typeof payload !== "object") return null;

    const obj = payload as Record<string, unknown>;

    if (obj.user && typeof obj.user === "object") {
      return obj.user;
    }

    if (obj.data && typeof obj.data === "object" && (obj.data as Record<string, unknown>).user) {
      return (obj.data as Record<string, unknown>).user;
    }

    return obj;
  };

  const unifyAuthPayload = (response: any) => {
    if (!response) return {};
    return response?.data?.data || response?.data || response;
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Immediately clear any previous login error when a new attempt begins
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Please enter your email address and password.");
      return;
    }

    try {
      setLoading(true);

      // 2. POST /auth/login (HttpOnly cookies set automatically by browser)
      const response = await authService.login({
        email: email.trim(),
        password,
      });

      // 3. HTTP 200 received -> clear error explicitly
      setErrorMsg(null);

      // Extract inline user from login response payload (if present)
      const loginPayload = unifyAuthPayload(response);
      const inlineUser = resolveUserObject(loginPayload);

      // 4. Retrieve authenticated user profile via GET /auth/me (browser automatically sends HttpOnly cookies)
      let userObj: any = inlineUser;
      try {
        const meResponse = await authService.getMe();
        const meData = meResponse?.data || meResponse;
        const fetchedUser = resolveUserObject(meData);
        if (fetchedUser && typeof fetchedUser === "object") {
          userObj = { ...userObj, ...fetchedUser };
        }
      } catch {
        // Fallback to inline login user object if /auth/me fails
      }

      if (!userObj || typeof userObj !== "object") {
        userObj = { email: email.trim() };
      } else if (!userObj.email) {
        userObj.email = email.trim();
      }

      const userRole = normalizeRole(userObj);

      if (!userRole) {
        throw new Error("Access Denied: The Admin Portal is restricted to authorized internal staff only.");
      }

      userObj.role = userRole;

      // 5. Store authenticated user session metadata needed by the UI
      setAuthData(
        {
          user: userObj,
        },
        rememberMe
      );
      setRememberedEmail(rememberMe ? email.trim() : "");

      // 6. Update auth state and navigate to correct dashboard
      notifyAuthChanged();
      navigate(getDashboardPathForRole(userRole), { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          setErrorMsg(
            "CORS / Origin Error: Please access the app via http://localhost:5173 to match backend CORS policy, or update backend CORSMiddleware origins."
          );
        } else {
          const backendErr = error.response.data?.error;
          const msg =
            backendErr?.message ||
            error.response.data?.message ||
            error.response.data?.detail ||
            "Invalid email or password. Please check your credentials.";
          setErrorMsg(String(msg));
        }
      } else if (error instanceof Error) {
        setErrorMsg(error.message);
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
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "12.5px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            lineHeight: 1.4,
          }}
        >
          ⚠️ <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ marginBottom: "12px" }}>
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

      <div style={{ marginBottom: "12px" }}>
        <label htmlFor="password">Password</label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <div className="login-options" style={{ marginBottom: "16px" }}>
        <label htmlFor="remember">
          <input
            id="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me
        </label>

        <a href="#forgot" onClick={(e) => { e.preventDefault(); setForgotOpen(true); }}>
          Forgot Password?
        </a>
      </div>

      <button
        type="submit"
        className="login-button"
        disabled={loading}
      >
        {loading ? "Logging In..." : "Login"}
      </button>

      <ForgotPasswordModal
        key={forgotOpen ? "forgot-open" : "forgot-closed"}
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email.trim()}
      />
    </form>
  );
};

export default LoginForm;