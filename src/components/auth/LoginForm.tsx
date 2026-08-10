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

  const findAccessToken = (payload: any) => {
    return (
      payload?.access_token ||
      payload?.token ||
      payload?.auth_token ||
      payload?.authToken ||
      payload?.data?.access_token ||
      payload?.data?.token
    );
  };

  const findRefreshToken = (payload: any) => {
    return payload?.refresh_token || payload?.refreshToken || payload?.data?.refresh_token || payload?.data?.refreshToken;
  };

  const authorizeUser = async (payload: any) => {
    const userObj = resolveUserObject(payload);
    if (!userObj || typeof userObj !== "object") {
      return null;
    }

    return {
      ...userObj,
      email: userObj.email || userObj.email_address || userObj.username || undefined,
    };
  };

  const completeLogin = async (authPayload: any) => {
    const access_token = findAccessToken(authPayload);
    const refresh_token = findRefreshToken(authPayload);

    if (!access_token) {
      throw new Error("Authentication response did not include an access token.");
    }

    let userObj = await authorizeUser(authPayload);

    if (!userObj || (typeof userObj === "object" && !userObj.role && !userObj.roles && !userObj.role_name && !userObj.user_type && !userObj.type && !userObj.slug && !userObj.title && !userObj.name)) {
      try {
        const meResponse = await authService.getMe();
        const meData = meResponse?.data || meResponse;
        const resolvedMeUser = resolveUserObject(meData);
        userObj = {
          ...(typeof userObj === "object" ? userObj : {}),
          ...(resolvedMeUser && typeof resolvedMeUser === "object" ? resolvedMeUser : meData),
        };
      } catch {
        // fallback to existing values
      }
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

    // Remember Me controls persistence:
    // checked  -> localStorage (session survives browser restarts)
    // unchecked -> sessionStorage (cleared when the browser/tab closes).
    // Passwords are never stored; only the email is remembered for convenience.
    setAuthData(
      {
        accessToken: String(access_token),
        refreshToken: refresh_token ? String(refresh_token) : null,
        user: userObj,
      },
      rememberMe
    );
    setRememberedEmail(rememberMe ? email.trim() : "");

    notifyAuthChanged();
    navigate(getDashboardPathForRole(userRole), { replace: true });
  };

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

      const payload = unifyAuthPayload(response);
      await completeLogin(payload);
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
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
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

        <a href="#forgot" onClick={(e) => { e.preventDefault(); setForgotOpen(true); }}>
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