interface PrimaryButtonProps {
  text: string;
  onClick?: () => void;
}

const PrimaryButton = ({ text, onClick }: PrimaryButtonProps) => {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#2563EB",
        color: "#fff",
        border: "none",
        padding: "12px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "15px",
        fontWeight: "600",
      }}
    >
      {text}
    </button>
  );
};

export default PrimaryButton;