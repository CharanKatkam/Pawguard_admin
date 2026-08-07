import React, { useMemo } from "react";
import { FaCheck, FaMinus, FaKey } from "react-icons/fa";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  SPECIAL_PERMISSIONS,
  matrixPermissionKeys,
  permissionKey,
  PERMISSION_MODULE_GROUPS,
  modulePermissionKeys,
} from "../../utils/permissionsCatalog";
import type { PermissionAction, PermissionModule } from "../../utils/permissionsCatalog";

interface PermissionMatrixEditorProps {
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
  /** Modules built from the Permissions API. Falls back to the static catalog. */
  modules?: PermissionModule[];
  /** Actions built from the Permissions API. Falls back to the static catalog. */
  actions?: PermissionAction[];
}

type CellState = 0 | 1 | 2;

const cellState = (count: number, total: number): CellState => {
  if (total === 0 || count === 0) return 0;
  if (count === total) return 2;
  return 1;
};

const Checkbox = ({
  state,
  disabled,
  onClick,
  label,
}: {
  state: CellState;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) => (
  <div
    onClick={disabled ? undefined : onClick}
    role="checkbox"
    aria-checked={state === 2}
    aria-label={label}
    title={label}
    style={{
      width: 20,
      height: 20,
      borderRadius: 6,
      border: disabled
        ? "1px solid #E2E8F0"
        : state === 0
        ? "1.5px solid #CBD5E1"
        : "1.5px solid #2563EB",
      background: state === 2 ? "#2563EB" : state === 1 ? "#BFDBFE" : "#FFFFFF",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: disabled ? "not-allowed" : "pointer",
      margin: 0,
      padding: 0,
      flexShrink: 0,
      boxSizing: "border-box",
      boxShadow: state !== 0 ? "0 1px 3px rgba(37, 99, 235, 0.25)" : "none",
      transition: "all 0.12s ease",
      userSelect: "none",
    }}
  >
    {state === 2 ? (
      <FaCheck size={10} color="#FFFFFF" />
    ) : state === 1 ? (
      <FaMinus size={10} color="#2563EB" />
    ) : null}
  </div>
);

const thBase: React.CSSProperties = {
  padding: "12px 10px",
  fontWeight: 700,
  color: "#334155",
  textAlign: "left",
  whiteSpace: "nowrap",
  background: "#F1F5F9",
};

const tdBase: React.CSSProperties = {
  padding: "8px 10px",
  verticalAlign: "middle",
};

/**
 * Permission Matrix Editor — module × action grid built from the Permissions
 * API. Supports Grant All / Clear All, column / row / group "select all"
 * checkboxes and a live counter of assigned permission codes.
 */
const PermissionMatrixEditor = ({
  value,
  onChange,
  disabled = false,
  modules: propModules,
  actions: propActions,
}: PermissionMatrixEditorProps) => {
  const selected = useMemo(() => new Set(value), [value]);
  const allKeys = useMemo(() => matrixPermissionKeys(), []);
  const actions = useMemo<PermissionAction[]>(
    () => (propActions && propActions.length > 0 ? propActions : PERMISSION_ACTIONS),
    [propActions]
  );
  const modules = useMemo<PermissionModule[]>(
    () => (propModules && propModules.length > 0 ? propModules : PERMISSION_MODULES),
    [propModules]
  );

  // Group the active modules (respecting the API-driven list order).
  const groups = useMemo(() => {
    const built: Array<{ label: string; modules: PermissionModule[] }> = [];
    const add = (label: string, list: PermissionModule[]) => {
      if (list.length === 0) return;
      const existing = built.find((g) => g.label === label);
      if (existing) existing.modules.push(...list);
      else built.push({ label, modules: list });
    };
    for (const group of PERMISSION_MODULE_GROUPS) {
      const list = modules.filter((m) => group.modules.includes(m.key));
      add(group.label, list);
    }
    const rest = modules.filter((m) => !PERMISSION_MODULE_GROUPS.some((g) => g.modules.includes(m.key)));
    add("Other Modules", rest);
    return built;
  }, [modules]);

  const toggle = (key: string) => {
    if (disabled) return;
    if (selected.has(key)) {
      onChange(value.filter((k) => k !== key));
    } else {
      onChange([...value, key]);
    }
  };

  const toggleRow = (moduleKey: string) => {
    if (disabled) return;
    const keys = modulePermissionKeys(moduleKey);
    const on = keys.filter((k) => selected.has(k)).length;
    if (on === keys.length) {
      const remove = new Set(keys);
      onChange(value.filter((k) => !remove.has(k)));
    } else {
      const add = keys.filter((k) => !selected.has(k));
      onChange([...value, ...add]);
    }
  };

  const toggleColumn = (actionKey: string) => {
    if (disabled) return;
    const keys = modules.map((m) => permissionKey(actionKey, m.key));
    const on = keys.filter((k) => selected.has(k)).length;
    if (on === keys.length) {
      const remove = new Set(keys);
      onChange(value.filter((k) => !remove.has(k)));
    } else {
      const add = keys.filter((k) => !selected.has(k));
      onChange([...value, ...add]);
    }
  };

  const toggleGroup = (groupModules: PermissionModule[]) => {
    if (disabled) return;
    const keys = groupModules.flatMap((m) => modulePermissionKeys(m.key));
    const on = keys.filter((k) => selected.has(k)).length;
    if (on === keys.length) {
      const remove = new Set(keys);
      onChange(value.filter((k) => !remove.has(k)));
    } else {
      const add = keys.filter((k) => !selected.has(k));
      onChange([...value, ...add]);
    }
  };

  const grantAll = () => {
    if (!disabled) onChange([...allKeys]);
  };
  const clearAll = () => {
    if (!disabled) onChange([]);
  };

  const selectedCount = selected.size;
  const pct = allKeys.length === 0 ? 0 : Math.round((selectedCount / allKeys.length) * 100);

  return (
    <div style={{ width: "100%" }}>
      {/* Toolbar: live counter + bulk actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 14,
          padding: "12px 14px",
          borderRadius: 12,
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        }}
      >
        <div style={{ minWidth: 220, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              color: "#E2E8F0",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <FaKey size={12} color="#60A5FA" style={{ alignSelf: "center" }} />
            <span style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF" }}>{selectedCount}</span>
            <span>
              of <strong>{allKeys.length}</strong> permissions granted
            </span>
            <span
              style={{
                marginLeft: "auto",
                padding: "2px 10px",
                borderRadius: 999,
                background: pct === 100 ? "#10B981" : "#2563EB",
                color: "#FFFFFF",
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              {pct}%
            </span>
          </div>
          <div
            style={{
              marginTop: 8,
              height: 6,
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                borderRadius: 999,
                background: pct === 100 ? "#34D399" : "#3B82F6",
                transition: "width 0.25s ease",
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={grantAll}
            disabled={disabled}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 9,
              border: "1px solid #3B82F6",
              background: "#2563EB",
              color: "#FFFFFF",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <FaCheck size={11} /> Grant All
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 9,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "#E2E8F0",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <FaMinus size={11} /> Clear All
          </button>
        </div>
      </div>

      {/* Responsive scroll container */}
      <div
        style={{
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: 460,
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          background: "#FFFFFF",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12.5,
            minWidth: 760,
          }}
        >
          {/* Sticky header */}
          <thead style={{ position: "sticky", top: 0, zIndex: 3 }}>
            <tr style={{ borderBottom: "2px solid #CBD5E1" }}>
              <th style={{ ...thBase, minWidth: 220 }}>Module</th>
              {actions.map((a) => {
                const count = modules.filter((m) => selected.has(permissionKey(a.key, m.key))).length;
                const st = cellState(count, modules.length);
                return (
                  <th key={a.key} style={{ ...thBase, textAlign: "center", minWidth: 84 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>{a.label}</span>
                      <Checkbox
                        state={st}
                        disabled={disabled}
                        onClick={() => toggleColumn(a.key)}
                        label={`Select all ${a.label} permissions`}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const groupKeys = group.modules.flatMap((m) => modulePermissionKeys(m.key));
              const groupOn = groupKeys.filter((k) => selected.has(k)).length;
              const groupState = cellState(groupOn, groupKeys.length);
              return (
                <React.Fragment key={group.label}>
                  {/* Group header row */}
                  <tr
                    style={{
                      background: "#EFF6FF",
                      borderTop: "1px solid #BFDBFE",
                    }}
                  >
                    <td colSpan={actions.length + 1} style={{ padding: "8px 14px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          cursor: disabled ? "default" : "pointer",
                        }}
                        onClick={() => toggleGroup(group.modules)}
                      >
                        <Checkbox
                          state={groupState}
                          disabled={disabled}
                          onClick={() => toggleGroup(group.modules)}
                          label={`Select all ${group.label}`}
                        />
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: 12.5,
                            color: "#1E40AF",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {group.label}
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: "#64748B",
                            background: "#FFFFFF",
                            border: "1px solid #BFDBFE",
                            borderRadius: 999,
                            padding: "2px 10px",
                          }}
                        >
                          {groupOn}/{groupKeys.length}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {/* Module rows with alternating colors */}
                  {group.modules.map((m, idx) => {
                    const keys = modulePermissionKeys(m.key);
                    const count = keys.filter((k) => selected.has(k)).length;
                    const st = cellState(count, keys.length);
                    const alt = idx % 2 === 1;
                    return (
                      <tr
                        key={m.key}
                        style={{
                          borderBottom: "1px solid #F1F5F9",
                          background: alt ? "#F8FAFC" : "#FFFFFF",
                          transition: "background 0.12s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!alt) e.currentTarget.style.background = "#F0F6FF";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = alt ? "#F8FAFC" : "#FFFFFF";
                        }}
                      >
                        <td style={tdBase}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Checkbox
                              state={st}
                              disabled={disabled}
                              onClick={() => toggleRow(m.key)}
                              label={`Select all permissions for ${m.label}`}
                            />
                            <span style={{ fontWeight: 600, color: "#0F172A" }}>{m.label}</span>
                          </div>
                        </td>
                        {actions.map((a) => {
                          const key = permissionKey(a.key, m.key);
                          const isOn = selected.has(key);
                          return (
                            <td
                              key={key}
                              style={{
                                ...tdBase,
                                textAlign: "center",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minHeight: 24,
                                }}
                              >
                                <Checkbox
                                  state={isOn ? 2 : 0}
                                  disabled={disabled}
                                  onClick={() => toggle(key)}
                                  label={`${a.label} ${m.label}`}
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Special / policy flag permissions */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 10,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Additional Policy Flags
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SPECIAL_PERMISSIONS.map((s) => {
            const isOn = selected.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                title={s.key}
                onClick={() => toggle(s.key)}
                disabled={disabled}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: isOn ? "1.5px solid #2563EB" : "1px solid #CBD5E1",
                  background: isOn ? "#EFF6FF" : "#FFFFFF",
                  color: isOn ? "#1D4ED8" : "#475569",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: disabled ? "not-allowed" : "pointer",
                  boxShadow: isOn ? "0 1px 3px rgba(37,99,235,0.2)" : "none",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: isOn ? "#2563EB" : "#CBD5E1",
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isOn ? <FaCheck size={7} color="#FFFFFF" /> : null}
                </span>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PermissionMatrixEditor;
