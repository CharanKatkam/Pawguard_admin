import React from "react";
import {
  FaDog,
  FaHome,
  FaAmbulance,
  FaChartLine,
  FaShieldAlt,
  FaBolt,
  FaLock,
} from "react-icons/fa";

type AuthLayoutProps = {
  children: React.ReactNode;
};

const stats = [
  { icon: <FaDog size={22} color="#F59E0B" />, value: "12,450+", label: "Dogs Rescued" },
  { icon: <FaHome size={22} color="#F59E0B" />, value: "4,280+", label: "Successful Adoptions" },
  { icon: <FaAmbulance size={22} color="#F59E0B" />, value: "128", label: "Active Rescue Cases" },
  { icon: <FaChartLine size={22} color="#F59E0B" />, value: "24/7", label: "Real-Time Monitoring" },
];

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.2fr) minmax(400px, 0.8fr)",
        background: "#F8FAFC",
      }}
      className="auth-layout-container"
    >
      {/* Left Panel - Premium Enterprise SaaS Visual Section */}
      <div
        style={{
          position: "relative",
          padding: "52px 60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at 15% 20%, rgba(37, 99, 235, 0.18) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(245, 158, 11, 0.12) 0%, transparent 45%), linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)",
          overflow: "hidden",
          color: "#FFFFFF",
        }}
      >
        {/* Subtle Background Paw Pattern Overlay (3-5% opacity) */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0.04,
            pointerEvents: "none",
          }}
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
        >
          <pattern id="paw-pattern-refined" width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M30 40C27 40 25 42 25 45C25 48 27 50 30 50C33 50 35 48 35 45C35 42 33 40 30 40Z"
              fill="#FFFFFF"
            />
            <circle cx="22" cy="34" r="2.5" fill="#FFFFFF" />
            <circle cx="27" cy="30" r="2.5" fill="#FFFFFF" />
            <circle cx="33" cy="30" r="2.5" fill="#FFFFFF" />
            <circle cx="38" cy="34" r="2.5" fill="#FFFFFF" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#paw-pattern-refined)" />
        </svg>

        {/* Modern Low-Opacity Enterprise Illustration (Bottom-Right, 15% Opacity) */}
        <svg
          style={{
            position: "absolute",
            bottom: "-20px",
            right: "-20px",
            width: "440px",
            height: "440px",
            opacity: 0.15,
            pointerEvents: "none",
          }}
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="250" cy="250" r="210" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="10 10" />
          <path d="M140 260 L210 330 L360 180" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="170" y="130" width="160" height="110" rx="14" stroke="#FFFFFF" strokeWidth="3.5" />
          <path d="M200 170 H300 M200 195 H270 M200 215 H240" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="370" cy="320" r="45" stroke="#F59E0B" strokeWidth="3" />
          <path d="M370 295 V345 M345 320 H395" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        </svg>

        {/* Main Hero Content Area */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: "560px" }}>
          {/* 1. Enterprise Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 16px",
              borderRadius: "999px",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              backdropFilter: "blur(12px)",
              color: "#F59E0B",
              fontWeight: 600,
              fontSize: "12.5px",
              marginBottom: "24px",
              letterSpacing: "0.02em",
              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.12)",
            }}
          >
            <FaShieldAlt size={12} color="#F59E0B" />
            <span>Enterprise Animal Rescue Platform</span>
          </div>

          {/* 2. Hero Heading (Slightly Reduced Size by 10-15%) */}
          <h1
            style={{
              fontSize: "38px",
              fontWeight: 800,
              lineHeight: 1.2,
              margin: "0 0 14px 0",
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
            }}
          >
            PawGuard
            <br />
            <span style={{ color: "#F8FAFC" }}>Admin Portal</span>
          </h1>

          {/* 3. Description */}
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: "#CBD5E1",
              margin: "0 0 24px 0",
              maxWidth: "520px",
            }}
          >
            A centralized platform for managing rescue operations, shelter administration, veterinary care, adoptions, volunteers, inventory, finance, and analytics across the entire PawGuard ecosystem.
          </p>

          {/* 5. Trust Indicators Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "32px",
            }}
          >
            {[
              { icon: <FaShieldAlt size={11} color="#F59E0B" />, label: "Secure Role Access" },
              { icon: <FaBolt size={11} color="#F59E0B" />, label: "Real-Time Operations" },
              { icon: <FaLock size={11} color="#F59E0B" />, label: "Enterprise Security" },
            ].map((badge) => (
              <div
                key={badge.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#E2E8F0",
                }}
              >
                {badge.icon}
                <span>{badge.label}</span>
              </div>
            ))}
          </div>

          {/* 4. Statistics Cards (With Professional SVG Icons & Gold Numbers) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "14px",
              maxWidth: "540px",
            }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="auth-stat-card"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.09)",
                  borderRadius: "16px",
                  padding: "18px 20px",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.2)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "default",
                }}
              >
                <div style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                  {stat.icon}
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "#F59E0B",
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#94A3B8",
                    marginTop: "4px",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 8. Refined Footer */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "20px",
            marginTop: "36px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            fontSize: "12px",
            color: "#64748B",
          }}
        >
          <div style={{ fontWeight: 600, color: "#94A3B8" }}>
            Trusted by Animal Rescue Organizations
          </div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>
            Version 1.0 • © 2026 PawGuard • Powered by VPD Technologies
          </div>
        </div>
      </div>

      {/* Right Section - Login Form Container */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "32px",
          background: "#FFFFFF",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;