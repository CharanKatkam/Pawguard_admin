import { useState } from "react";
import type { CSSProperties } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

type PasswordInputProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};

const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  placeholder = "Enter your password",
  autoComplete,
  required,
  disabled,
  className,
  style,
  ariaLabel,
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-wrapper" style={{ position: "relative" }}>
      <input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        className={className}
        aria-label={ariaLabel}
        style={{ ...style, paddingRight: 44, boxSizing: "border-box" }}
      />

      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
        title={showPassword ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          top: "50%",
          right: "14px",
          transform: "translateY(-50%)",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "#64748B",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#0F172A")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
        onFocus={(e) => (e.currentTarget.style.color = "#0F172A")}
        onBlur={(e) => (e.currentTarget.style.color = "#64748B")}
      >
        {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
      </button>
    </div>
  );
};

export default PasswordInput;
