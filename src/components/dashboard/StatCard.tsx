import {
  FaUsers,
  FaPaw,
  FaHeart,
  FaHome,
} from "react-icons/fa";

interface StatCardProps {
  title: string;
  value: string;
  color: string;
}

const StatCard = ({
  title,
  value,
  color,
}: StatCardProps) => {
  const getIcon = () => {
    switch (title) {
      case "Total Users":
        return <FaUsers />;
      case "Total Pets":
        return <FaPaw />;
      case "Adoptions":
        return <FaHeart />;
      case "Shelters":
        return <FaHome />;
      default:
        return <FaUsers />;
    }
  };

  const getSubtitle = () => {
    switch (title) {
      case "Total Users":
        return "Registered users";
      case "Total Pets":
        return "Available pets";
      case "Adoptions":
        return "Successful adoptions";
      case "Shelters":
        return "Partner shelters";
      default:
        return "";
    }
  };

  const getTrend = () => {
    switch (title) {
      case "Total Users":
        return "+12%";
      case "Total Pets":
        return "+8%";
      case "Adoptions":
        return "+15%";
      case "Shelters":
        return "+3%";
      default:
        return "";
    }
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "18px",
        padding: "20px",
        boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
        border: "1px solid #E2E8F0",
        transition: "all 0.3s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow =
          "0 18px 40px rgba(37,99,235,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 10px 30px rgba(15,23,42,0.08)";
      }}
    >
      {/* Top Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "16px",
            background: color,
            color: "#fff",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "22px",
          }}
        >
          {getIcon()}
        </div>

        <div
          style={{
            background: "#DCFCE7",
            color: "#15803D",
            padding: "6px 12px",
            borderRadius: "999px",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {getTrend()}
        </div>
      </div>

      {/* Title */}
      <p
        style={{
          marginTop: "18px",
          marginBottom: "6px",
          color: "#64748B",
          fontSize: "15px",
          fontWeight: 500,
        }}
      >
        {title}
      </p>

      {/* Value */}
      <h2
        style={{
          margin: 0,
          fontSize: "34px",
          fontWeight: 700,
          color: "#0F172A",
        }}
      >
        {value}
      </h2>

      {/* Subtitle */}
      <p
        style={{
          marginTop: "6px",
          marginBottom: 0,
          color: "#94A3B8",
          fontSize: "14px",
        }}
      >
        {getSubtitle()}
      </p>
    </div>
  );
};

export default StatCard;