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

        <p className="login-subtitle">
          Sign in to your account
        </p>

        <LoginForm />

        <div className="login-options">
          <label htmlFor="remember">
            <input
              id="remember"
              type="checkbox"
            />
            Remember me
          </label>

          <a href="#">
            Forgot Password?
          </a>
        </div>
      </LoginCard>
    </AuthLayout>
  );
};

export default Login;