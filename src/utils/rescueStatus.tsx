/** Canonical rescue lifecycle (PRR): reported -> verified -> dispatched -> located -> rescued -> admitted. */

export const RESCUE_STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  reported: { label: "Reported", bg: "#FFFBEB", color: "#B45309" },
  verified: { label: "Verified", bg: "#EFF6FF", color: "#2563EB" },
  dispatched: { label: "Dispatched", bg: "#F5F3FF", color: "#7C3AED" },
  located: { label: "Located", bg: "#ECFEFF", color: "#0891B2" },
  rescued: { label: "Rescued", bg: "#ECFDF5", color: "#059669" },
  admitted: { label: "Admitted", bg: "#D1FAE5", color: "#065F46" },
  rejected: { label: "Rejected", bg: "#FEF2F2", color: "#DC2626" },
};

export const rescueStatusMeta = (status?: string | null) => {
  const meta = RESCUE_STATUS_META[String(status || "").toLowerCase()] || {
    label: status || "Unknown",
    bg: "#F1F5F9",
    color: "#475569",
  };
  return meta;
};

/** Renders a canonical rescue status as a badge element. */
export const rescueStatusBadge = (status?: string | null) => {
  const meta = rescueStatusMeta(status);
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: 600,
        background: meta.bg,
        color: meta.color,
        textTransform: "capitalize",
      }}
    >
      {meta.label}
    </span>
  );
};

export interface DispatchStageInfo {
  label: string;
  bg: string;
  color: string;
}

/**
 * Dispatch status derived from the rescue request lifecycle + whether a
 * dispatch record exists. Backend dispatch records carry no independent
 * status field; the rescue request status drives the stage.
 */
export const dispatchStage = (req?: {
  status?: string | null;
  dispatch?: unknown;
}): DispatchStageInfo => {
  const status = String(req?.status || "").toLowerCase();
  const hasDispatch = Boolean(req?.dispatch);
  if (!hasDispatch && (status === "reported" || status === "verified" || status === "rejected")) {
    return { label: "Not Assigned", bg: "#F1F5F9", color: "#475569" };
  }
  if (!hasDispatch && status === "") {
    return { label: "Not Assigned", bg: "#F1F5F9", color: "#475569" };
  }
  if (!hasDispatch && (status === "dispatched" || status === "located")) {
    return { label: "Dispatched", bg: "#F5F3FF", color: "#7C3AED" };
  }
  switch (status) {
    case "verified":
      return { label: "Awaiting Dispatch", bg: "#EFF6FF", color: "#2563EB" };
    case "dispatched":
      return { label: "Dispatched", bg: "#F5F3FF", color: "#7C3AED" };
    case "located":
      return { label: "At Location", bg: "#ECFEFF", color: "#0891B2" };
    case "rescued":
      return { label: "Rescued", bg: "#ECFDF5", color: "#059669" };
    case "admitted":
      return { label: "Completed", bg: "#D1FAE5", color: "#065F46" };
    case "rejected":
      return { label: "Rejected", bg: "#FEF2F2", color: "#DC2626" };
    default:
      return { label: "Not Assigned", bg: "#F1F5F9", color: "#475569" };
  }
};

/** Agents assigned to a dispatch (RescueDispatchAgentResponse[]). */
export const dispatchAgentNames = (dispatch?: {
  agents?: Array<{ agent_id?: string; role?: string | null }> | null;
  assigned_driver_id?: string | null;
}): { agents: string[]; driver: string } => {
  const agents = Array.isArray(dispatch?.agents) ? dispatch.agents.map((a) => a.agent_id || "-") : [];
  return { agents, driver: dispatch?.assigned_driver_id || "" };
};
