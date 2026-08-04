import { useEffect, useState } from "react";
import dashboardService from "../../services/dashboardService";
import { useDataSync } from "../../utils/dataSync";
import { getActivityStream } from "../../utils/eventSystem";

interface Activity {
  id?: number | string;
  title?: string;
  desc?: string;
  description?: string;
  message?: string;
  action?: string;
  activity?: string;
  time?: string;
  created_at?: string;
  timestamp?: string;
  type?: string;
}

const RecentActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = async () => {
    try {
      setLoading(true);
      let data: Activity[] = [];
      try {
        const response = await dashboardService.getRecentActivities();
        const resData = response?.data ?? response ?? [];
        if (Array.isArray(resData)) {
          data = resData;
        }
      } catch {
        // Fallback handled via stream
      }

      const stream = getActivityStream();
      setActivities([...stream, ...data]);
    } catch (error) {
      console.error("Recent Activities Error:", error);
      setActivities(getActivityStream());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  useDataSync(loadActivities);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "24px",
        marginTop: "30px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>
        Recent Activities
      </h2>

      {loading ? (
        <p>Loading...</p>
      ) : activities.length === 0 ? (
        <p>No recent activities found.</p>
      ) : (
        activities.map((activity, index) => (
          <div
            key={activity.id ?? index}
            style={{
              borderBottom: "1px solid #E5E7EB",
              padding: "15px 0",
            }}
          >
            <h4 style={{ margin: 0 }}>
              {activity.title ||
                activity.action ||
                activity.activity ||
                "Activity"}
            </h4>

            <p
              style={{
                margin: "6px 0",
                color: "#6B7280",
              }}
            >
              {activity.desc ||
                activity.description ||
                activity.message ||
                "No description available"}
            </p>

            <small
              style={{
                color: "#9CA3AF",
              }}
            >
              {activity.time ||
                activity.created_at ||
                activity.timestamp ||
                "-"}
            </small>
          </div>
        ))
      )}
    </div>
  );
};

export default RecentActivities;