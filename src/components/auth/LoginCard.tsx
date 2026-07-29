import "../../pages/auth/Login.css";

type LoginCardProps = {
  children: React.ReactNode;
};

const LoginCard = ({ children }: LoginCardProps) => {
  return <div className="login-card">{children}</div>;
};

export default LoginCard;