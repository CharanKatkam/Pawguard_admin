import StatCard from "../../components/dashboard/StatCard";
import RecentActivities from "../../components/dashboard/RecentActivities";
import LatestPets from "../../components/dashboard/LatestPets";
import AdoptionChart from "../../components/dashboard/AdoptionChart";

const Dashboard = () => {
  const stats = [
    {
      title: "Total Users",
      value: "1,248",
      color: "#2563EB",
    },
    {
      title: "Total Pets",
      value: "342",
      color: "#16A34A",
    },
    {
      title: "Adoptions",
      value: "186",
      color: "#F59E0B",
    },
    {
      title: "Shelters",
      value: "24",
      color: "#DC2626",
    },
  ];

  return (
    <div>
      {/* Welcome Section */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "35px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "18px",
            color: "#64748B",
          }}
        >
          Welcome to <strong>PawGuard Admin Portal</strong>
        </p>

        <p
          style={{
            marginTop: "8px",
            color: "#94A3B8",
            fontSize: "15px",
          }}
        >
          Manage users, pets, shelters, adoptions, and reports from one place.
        </p>
      </div>

      {/* Statistics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        {stats.map((item) => (
          <StatCard
            key={item.title}
            title={item.title}
            value={item.value}
            color={item.color}
          />
        ))}
      </div>

      {/* Chart */}
      <AdoptionChart />

      {/* Bottom Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        <RecentActivities />
        <LatestPets />
      </div>
    </div>
  );
};

export default Dashboard;