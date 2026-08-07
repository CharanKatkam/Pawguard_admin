import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";

interface ExecutiveSummaryCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  path: string;
  loading?: boolean;
}

const ExecutiveSummaryCard = ({
  title,
  value,
  subtitle,
  icon,
  color,
  path,
  loading,
}: ExecutiveSummaryCardProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "14px",
          padding: "16px",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <div className="dash-shimmer" style={{ height: 26, width: 120, borderRadius: 6 }} />
        <div className="dash-shimmer" style={{ height: 34, width: 70, borderRadius: 6, marginTop: 16 }} />
        <div className="dash-shimmer" style={{ height: 12, width: 150, borderRadius: 6, marginTop: 12 }} />
      </div>
    );
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(path)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(path);
      }}
      style={{
        display: "block",
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "14px",
        padding: "16px",
        textDecoration: "none",
        color: "inherit",
        transition: "all 0.2s ease-in-out",
        height: "100%",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 12px 24px -8px rgba(15, 23, 42, 0.12)";
        e.currentTarget.style.borderColor = "#CBD5E1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(15, 23, 42, 0.05)";
        e.currentTarget.style.borderColor = "#E2E8F0";
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: color,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.02em" }}>
          {title}
        </span>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "10px",
            background: `${color}15`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ marginTop: "14px", display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "#0F172A",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {value.toLocaleString()}
        </span>
        <FaArrowRight size={12} style={{ color: "#CBD5E1" }} />
      </div>
      {subtitle && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "12px",
            color: value === 0 ? "#F59E0B" : "#94A3B8",
          }}
        >
          {value === 0 ? "No records yet" : subtitle}
        </p>
      )}
    </div>
  );
};

export default ExecutiveSummaryCard;
