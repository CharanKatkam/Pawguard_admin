import AuthLayout from "../../components/auth/AuthLayout";
import LoginForm from "../../components/auth/LoginForm";
import LoginCard from "../../components/auth/LoginCard";
import PawGuardLogo from "../../components/common/PawGuardLogo";
import "./Login.css";

const Login = () => {
  return (
    <AuthLayout>
      <LoginCard>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <PawGuardLogo size={48} badgeBg="#2563EB" iconColor="#FFFFFF" />
        </div>

        <h1 className="login-title">PawGuard</h1>

        <p className="login-subtitle">
          Sign in to your account
        </p>

        <LoginForm />
      </LoginCard>
    </AuthLayout>
  );
};

export default Login;