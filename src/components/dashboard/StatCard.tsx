import React from "react";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  description?: string;
  icon?: React.ReactNode;
  color?: string;
}

const StatCard = ({
  title,
  value,
  trend,
  trendUp = true,
  description,
  icon,
  color = "#2563EB",
}: StatCardProps) => {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "16px",
        padding: "20px 22px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "all 0.2s ease-in-out",
        height: "100%",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 12px 24px -6px rgba(15, 23, 42, 0.08)";
        e.currentTarget.style.borderColor = "#CBD5E1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(15, 23, 42, 0.05)";
        e.currentTarget.style.borderColor = "#E2E8F0";
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#64748B" }}>
          {title}
        </span>

        {icon && (
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: `${color}15`,
              color: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Main Value & Trend */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <h3
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {value}
          </h3>

          {trend && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                fontSize: "12px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                background: trendUp ? "#ECFDF5" : "#FEF2F2",
                color: trendUp ? "#10B981" : "#EF4444",
              }}
            >
              {trendUp ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
              {trend}
            </span>
          )}
        </div>

        {description && (
          <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#94A3B8" }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;