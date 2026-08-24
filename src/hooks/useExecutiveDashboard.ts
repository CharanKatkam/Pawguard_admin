import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeToDataChange } from "../utils/dataSync";
import { getActivityStream } from "../utils/eventSystem";
import { dashboardService } from "../services/dashboardService";
import { formatDateTime } from "../utils/dateUtils";
import { firstDefined, unwrapList } from "../utils/chartUtils";
import type { ActivityEntry, AnyRecord, DashboardSummary } from "../types/dashboard";

export interface ExecutiveDashboardData {
  summary: DashboardSummary;
  users: AnyRecord[];
  dogs: AnyRecord[];
  shelters: AnyRecord[];
  rescues: AnyRecord[];
  adoptions: AnyRecord[];
  fosters: AnyRecord[];
  volunteers: AnyRecord[];
  inventory: AnyRecord[];
  medical: AnyRecord[];
  finance: AnyRecord[];
  donations: AnyRecord[];
  financeSummary: AnyRecord | null;
  activities: ActivityEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const unwrapObject = (value: unknown): DashboardSummary => {
  if (!value || typeof value !== "object") return {};
  const obj = value as AnyRecord;
  if (obj.data && typeof obj.data === "object") return obj.data as DashboardSummary;
  if (obj.summary && typeof obj.summary === "object") return obj.summary as DashboardSummary;
  if (obj.dashboard && typeof obj.dashboard === "object") return obj.dashboard as DashboardSummary;
  return obj as unknown as DashboardSummary;
};

const normalizeActivity = (raw: AnyRecord): ActivityEntry | null => {
  const title = String(
    firstDefined(raw.title, raw.action, raw.activity, raw.event, raw.description, raw.message) ?? ""
  ).trim();
  if (!title) return null;
  const timeRaw = firstDefined(raw.time, raw.created_at, raw.timestamp, raw.date);
  const userRaw = firstDefined(
    raw.user,
    raw.username,
    raw.user_name,
    raw.user_email,
    raw.actor,
    raw.email,
    raw.admin,
    raw.performed_by
  );
  return {
    id: (firstDefined(raw.id, raw.activity_id, raw.log_id) as ActivityEntry["id"]) ??
      `ACT-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    user: userRaw === null ? "System" : String(userRaw),
    action: title,
    module: String(firstDefined(raw.module, raw.category, raw.type, raw.entity) ?? "system"),
    time: timeRaw ? formatDateTime(timeRaw as string) : "Just now",
    status: String(firstDefined(raw.status, raw.result, raw.state) ?? "Success"),
    raw,
  };
};

const mergeActivities = (apiItems: ActivityEntry[], stream: ActivityEntry[]): ActivityEntry[] => {
  const seen = new Set<string>();
  const merged: ActivityEntry[] = [];
  [...apiItems, ...stream].forEach((entry) => {
    const key = String(entry.id);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(entry);
  });
  return merged.slice(0, 10);
};

export function useExecutiveDashboard() {
  const [data, setData] = useState<ExecutiveDashboardData>({
    summary: {},
    users: [],
    dogs: [],
    shelters: [],
    rescues: [],
    adoptions: [],
    fosters: [],
    volunteers: [],
    inventory: [],
    medical: [],
    finance: [],
    donations: [],
    financeSummary: null,
    activities: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setRefreshing(true);
    setData((prev) => ({ ...prev, loading: prev.lastUpdated === null, error: null }));

    // Lightweight summary startup: fetch aggregate summary & recent activities only
    const results = await Promise.allSettled([
      dashboardService.getSuperAdminDashboard(),
      dashboardService.getRecentActivities(10),
    ]);

    if (requestId !== requestIdRef.current) return;

    const [summaryRes, activitiesRes] = results;

    const activities = mergeActivities(
      unwrapList(activitiesRes.status === "fulfilled" ? activitiesRes.value : []).map(normalizeActivity).filter((a): a is ActivityEntry => a !== null),
      getActivityStream()
        .map((item) => normalizeActivity(item as unknown as AnyRecord))
        .filter((a): a is ActivityEntry => a !== null)
    );

    const hasError = summaryRes.status === "rejected";
    const summaryObj = unwrapObject(summaryRes.status === "fulfilled" ? summaryRes.value : {});

    setData((prev) => ({
      ...prev,
      summary: summaryObj,
      users: [],
      dogs: [],
      shelters: [],
      rescues: [],
      adoptions: [],
      fosters: [],
      volunteers: [],
      inventory: [],
      medical: [],
      finance: [],
      donations: [],
      financeSummary: summaryObj,
      activities,
      loading: false,
      error: hasError ? "Dashboard summary data currently unavailable." : null,
      lastUpdated: new Date(),
    }));
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    const unsubscribe = subscribeToDataChange(() => {
      refresh();
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [refresh]);

  return { ...data, refresh, refreshing };
}

export default useExecutiveDashboard;
