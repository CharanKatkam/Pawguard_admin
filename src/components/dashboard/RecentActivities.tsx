import { useEffect, useState } from "react";
import dashboardService from "../../services/dashboardService";

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

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const response = await dashboardService.getRecentActivities();

      console.log("Recent Activities API:", response);

      const data = response?.data ?? [];

      console.table(data);

      if (Array.isArray(data)) {
        setActivities(data);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error("Recent Activities Error:", error);

      // Fallback data
      setActivities([
        {
          id: 1,
          title: "New Rescue Case Dispatched",
          description: "Agent Alex assigned to Case #DOG-409",
          time: "10 mins ago",
        },
        {
          id: 2,
          title: "Surgery Successfully Completed",
          description: "Dr. John Smith completed Max's hind leg repair",
          time: "42 mins ago",
        },
        {
          id: 3,
          title: "Adoption Request Approved",
          description: "Michael Chang approved for Luna (DOG-104)",
          time: "2 hrs ago",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

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