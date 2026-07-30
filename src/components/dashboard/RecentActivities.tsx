const activities = [
  {
    id: 1,
    title: "New pet registered",
    description: "Buddy was added to the system.",
    time: "10 mins ago",
  },
  {
    id: 2,
    title: "Adoption Approved",
    description: "Lucy has been adopted.",
    time: "30 mins ago",
  },
  {
    id: 3,
    title: "New User Registered",
    description: "John Doe created an account.",
    time: "1 hour ago",
  },
  {
    id: 4,
    title: "Shelter Updated",
    description: "Happy Paws Shelter updated details.",
    time: "2 hours ago",
  },
];

const RecentActivities = () => {
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
      <h2
        style={{
          marginBottom: "20px",
        }}
      >
        Recent Activities
      </h2>

      {activities.map((activity) => (
        <div
          key={activity.id}
          style={{
            borderBottom: "1px solid #E5E7EB",
            padding: "15px 0",
          }}
        >
          <h4
            style={{
              margin: 0,
            }}
          >
            {activity.title}
          </h4>

          <p
            style={{
              margin: "6px 0",
              color: "#6B7280",
            }}
          >
            {activity.description}
          </p>

          <small
            style={{
              color: "#9CA3AF",
            }}
          >
            {activity.time}
          </small>
        </div>
      ))}
    </div>
  );
};

export default RecentActivities;