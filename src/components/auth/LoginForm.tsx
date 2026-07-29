import PasswordInput from "./PasswordInput";

const LoginForm = () => {
  return (
    <>
      <input
        type="email"
        placeholder="Email Address"
        style={{
          width: "100%",
          padding: "14px 16px",
          marginTop: "20px",
          border: "1px solid #CBD5E1",
          borderRadius: "10px",
          fontSize: "15px",
          boxSizing: "border-box",
          outline: "none",
          marginBottom: "16px",
        }}
      />

      <PasswordInput />
    </>
  );
};

export default LoginForm;