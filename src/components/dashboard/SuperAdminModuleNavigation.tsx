import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowRight, FaCheck, FaChevronDown } from "react-icons/fa";
import {
  FaTruckMedical,
  FaStethoscope,
  FaBuilding,
  FaHeart,
  FaHouse,
  FaHandsHolding,
  FaBoxesStacked,
  FaDollarSign,
} from "react-icons/fa6";
import {
  MASTER_MODULES,
  getModuleChildKeyForPath,
  getModuleKeyForPath,
} from "../../utils/roleUtils";
import type { MasterModuleChild, MasterModuleDef } from "../../utils/roleUtils";

const renderModuleIcon = (iconType: MasterModuleDef["iconType"]) => {
  switch (iconType) {
    case "rescues":
      return <FaTruckMedical />;
    case "medical":
      return <FaStethoscope />;
    case "shelters":
      return <FaBuilding />;
    case "adoptions":
      return <FaHeart />;
    case "fosters":
      return <FaHouse />;
    case "volunteers":
      return <FaHandsHolding />;
    case "inventory":
      return <FaBoxesStacked />;
    case "finance":
      return <FaDollarSign />;
    default:
      return <FaArrowRight />;
  }
};

/**
 * Top-level module/dashboard buttons for the Super Admin master dashboard.
 *
 * Each button opens the SAME existing role dashboard route. Modules with
 * children (Rescue → Rescue Centre Admin / Rescue Coordinator / Rescue Agent)
 * open a dropdown switcher. The authenticated user remains SUPER_ADMIN — this
 * only changes which dashboard is being viewed, never the session/identity.
 */
const SuperAdminModuleNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Active module resolution is derived purely from the current route. While
  // inside a role dashboard (e.g. /dashboard/veterinarian) the matching card is
  // highlighted; on the Super Admin Dashboard (/dashboard/super-admin) no route
  // matches any module, so every card returns to its neutral state and no stale
  // selection is ever carried back or persisted.
  const activeKey = getModuleKeyForPath(location.pathname);
  const activeChildKey = getModuleChildKeyForPath(location.pathname);

  // Close any open dropdown on outside click / Escape.
  useEffect(() => {
    if (!openKey) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenKey(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openKey]);

  const handleNavigate = (mod: MasterModuleDef) => {
    setOpenKey(null);
    navigate(mod.path);
  };

  const handleChildNavigate = (child: MasterModuleChild) => {
    setOpenKey(null);
    navigate(child.path);
  };

  return (
    <div
      ref={rootRef}
      className="master-module-grid"
    >
      {MASTER_MODULES.map((mod) => {
        const active = mod.key === activeKey;
        const hasChildren = !!mod.children && mod.children.length > 0;
        const isOpen = openKey === mod.key;
        return (
          <div key={mod.key} style={{ position: "relative", height: "100%" }}>
            <button
              onClick={() => (hasChildren ? setOpenKey((prev) => (prev === mod.key ? null : mod.key)) : handleNavigate(mod))}
              aria-haspopup={hasChildren ? "menu" : undefined}
              aria-expanded={hasChildren ? isOpen : undefined}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = "#CBD5E1";
                  e.currentTarget.style.boxShadow = "0 6px 14px -8px rgba(15, 23, 42, 0.18)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = active ? mod.color : "#E2E8F0";
                e.currentTarget.style.boxShadow = active
                  ? "0 4px 12px rgba(15, 23, 42, 0.08)"
                  : "0 1px 3px rgba(15, 23, 42, 0.05)";
              }}
              style={{
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: "8px",
                textAlign: "left",
                padding: "14px",
                borderRadius: "12px",
                background: active ? "#F0F5FF" : "#FFFFFF",
                border: `1.5px solid ${active ? mod.color : "#E2E8F0"}`,
                cursor: "pointer",
                transition: "all 0.18s ease-in-out",
                boxShadow: active
                  ? "0 4px 12px rgba(15, 23, 42, 0.08)"
                  : "0 1px 3px rgba(15, 23, 42, 0.05)",
              }}
              title={hasChildren ? `${mod.label} — choose a role dashboard` : `${mod.label} — ${mod.description}`}
            >
              <span
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: `${mod.color}15`,
                  color: mod.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "17px",
                  flexShrink: 0,
                }}
              >
                {renderModuleIcon(mod.iconType)}
              </span>
              <span style={{ width: "100%", flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: active ? mod.color : "#0F172A",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {mod.label}
                  </span>
                  {hasChildren ? (
                    <FaChevronDown
                      size={10}
                      style={{
                        color: isOpen ? mod.color : "#94A3B8",
                        flexShrink: 0,
                        transform: isOpen ? "rotate(180deg)" : "none",
                        transition: "transform 0.15s ease",
                      }}
                    />
                  ) : (
                    <FaArrowRight size={10} style={{ color: "#CBD5E1", flexShrink: 0 }} />
                  )}
                </span>
                <span
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    marginTop: "2px",
                    fontSize: "11px",
                    color: "#94A3B8",
                    lineHeight: 1.35,
                  }}
                >
                  {mod.description}
                </span>
              </span>
            </button>

            {hasChildren && isOpen && mod.children && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "6px",
                  minWidth: "250px",
                  maxWidth: "calc(100vw - 40px)",
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  boxShadow: "0 16px 32px -12px rgba(15, 23, 42, 0.25)",
                  padding: "6px",
                  zIndex: 60,
                }}
              >
                {mod.children.map((child) => {
                  const childActive = child.key === activeChildKey;
                  return (
                    <button
                      key={child.key}
                      role="menuitem"
                      onClick={() => handleChildNavigate(child)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: childActive ? "#EFF6FF" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!childActive) e.currentTarget.style.background = "#F8FAFC";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = childActive ? "#EFF6FF" : "transparent";
                      }}
                    >
                      <span
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "8px",
                          background: `${child.color}15`,
                          color: child.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "13px",
                          flexShrink: 0,
                        }}
                      >
                        {renderModuleIcon(mod.iconType)}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                          {child.label}
                        </span>
                        <span style={{ display: "block", fontSize: "11px", color: "#94A3B8", lineHeight: 1.35 }}>
                          {child.description}
                        </span>
                      </span>
                      {childActive && <FaCheck size={12} style={{ color: mod.color, flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SuperAdminModuleNavigation;
