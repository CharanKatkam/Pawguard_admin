type AuthLayoutProps = {
  children: React.ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #EEF4FF 0%, #DDEBFF 100%)",
      }}
    >
      {children}
    </div>
  );
};

export default AuthLayout;