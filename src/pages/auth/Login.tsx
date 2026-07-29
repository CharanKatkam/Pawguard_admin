import logo from "../../assets/logo.png";
import AuthLayout from "../../components/auth/AuthLayout";
import LoginForm from "../../components/auth/LoginForm";
import LoginCard from "../../components/auth/LoginCard";
import "./Login.css";

const Login = () => {
  return (
    <AuthLayout>
      <LoginCard>
        <img
            src={logo}
            alt="PawGuard Logo"
            className="login-logo"
        />

        <h1 className="login-title">PawGuard</h1>

        <p className="login-subtitle">Sign in to your account</p>

        <LoginForm />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <input type="checkbox" id="remember" />
            <label
              htmlFor="remember"
              style={{
                marginLeft: "8px",
                fontSize: "14px",
                color: "#475569",
              }}
            >
              Remember me
            </label>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#0F172A",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Forgot Password?
          </p>
        </div>
        <button className="login-button">
            Sign In
        </button>
        
      </LoginCard>
    </AuthLayout>
  );
};

export default Login;