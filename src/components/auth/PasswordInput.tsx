import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

type PasswordInputProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const PasswordInput = ({ value, onChange }: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-wrapper">
      <input
        type={showPassword ? "text" : "password"}
        placeholder="Enter your password"
        value={value}
        onChange={onChange}
      />

      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
      </button>
    </div>
  );
};

export default PasswordInput;