const ReportCards = () => {
  const reports = [
    { title: "Total Pets", value: 156 },
    { title: "Adoptions", value: 89 },
    { title: "Shelters", value: 18 },
    { title: "Users", value: 245 },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "20px",
      }}
    >
      {reports.map((report) => (
        <div
          key={report.title}
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h3>{report.title}</h3>
          <h1>{report.value}</h1>
        </div>
      ))}
    </div>
  );
};

export default ReportCards;