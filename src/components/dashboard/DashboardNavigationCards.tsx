import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import {
  FaTruckMedical,
  FaHeart,
  FaBuilding,
  FaHouse,
  FaHandsHolding,
  FaStethoscope,
  FaBoxesStacked,
  FaDollarSign,
} from "react-icons/fa6";

const modules: Array<{
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  path: string;
}> = [
  { title: "Rescue Operations", description: "Cases, requests & dispatch", icon: <FaTruckMedical />, color: "#EF4444", path: "/rescues" },
  { title: "Adoptions", description: "Pending applications & matches", icon: <FaHeart />, color: "#EC4899", path: "/adoptions" },
  { title: "Shelters", description: "Facilities, occupancy & kennels", icon: <FaBuilding />, color: "#8B5CF6", path: "/shelters" },
  { title: "Foster Care", description: "Placements & coordinator view", icon: <FaHouse />, color: "#10B981", path: "/fosters" },
  { title: "Volunteers", description: "Applications, shifts & attendance", icon: <FaHandsHolding />, color: "#F59E0B", path: "/volunteers" },
  { title: "Medical Records", description: "Exams, vaccinations & surgery", icon: <FaStethoscope />, color: "#06B6D4", path: "/medical-records" },
  { title: "Inventory", description: "Stock levels, alerts & purchases", icon: <FaBoxesStacked />, color: "#F97316", path: "/inventory" },
  { title: "Finance", description: "Transactions, donations & expenses", icon: <FaDollarSign />, color: "#14B8A6", path: "/finance" },
];

const DashboardNavigationCards = () => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "12px",
      }}
    >
      {modules.map((mod) => (
        <div
          key={mod.title}
          role="button"
          tabIndex={0}
          onClick={() => navigate(mod.path)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") navigate(mod.path);
          }}
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: "16px",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 10px 20px -8px rgba(15, 23, 42, 0.12)";
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
              width: "38px",
              height: "38px",
              borderRadius: "11px",
              background: `${mod.color}15`,
              color: mod.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              marginBottom: "12px",
            }}
          >
            {mod.icon}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <h4 style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "#0F172A" }}>
              {mod.title}
            </h4>
            <FaArrowRight size={11} style={{ color: "#CBD5E1", flexShrink: 0 }} />
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#94A3B8" }}>
            {mod.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default DashboardNavigationCards;
