import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const data = [
  { month: "Jan", adoptions: 12 },
  { month: "Feb", adoptions: 18 },
  { month: "Mar", adoptions: 24 },
  { month: "Apr", adoptions: 20 },
  { month: "May", adoptions: 30 },
  { month: "Jun", adoptions: 36 },
];

const AdoptionChart = () => {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "20px",
        padding: "24px",
        marginTop: "30px",
        border: "1px solid #E2E8F0",
        boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              color: "#0F172A",
            }}
          >
            Monthly Adoption Analytics
          </h2>

          <p
            style={{
              marginTop: "6px",
              color: "#64748B",
              fontSize: "15px",
            }}
          >
            Adoption trends over the last six months
          </p>
        </div>

        <select
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1px solid #CBD5E1",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option>Monthly</option>
          <option>Weekly</option>
          <option>Yearly</option>
        </select>
      </div>

      {/* Summary */}
      <div
        style={{
          display: "flex",
          gap: "40px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#64748B",
              fontSize: "14px",
            }}
          >
            This Month
          </p>

          <h3
            style={{
              margin: "6px 0 0",
              color: "#16A34A",
              fontSize: "30px",
            }}
          >
            36
          </h3>
        </div>

        <div>
          <p
            style={{
              margin: 0,
              color: "#64748B",
              fontSize: "14px",
            }}
          >
            Last Month
          </p>

          <h3
            style={{
              margin: "6px 0 0",
              color: "#2563EB",
              fontSize: "30px",
            }}
          >
            30
          </h3>
        </div>

        <div>
          <p
            style={{
              margin: 0,
              color: "#64748B",
              fontSize: "14px",
            }}
          >
            Growth
          </p>

          <h3
            style={{
              margin: "6px 0 0",
              color: "#F59E0B",
              fontSize: "30px",
            }}
          >
            +20%
          </h3>
        </div>
      </div>

      {/* Chart */}
      <div
        style={{
          width: "100%",
          height: 330,
        }}
      >
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid
              stroke="#E2E8F0"
              strokeDasharray="5 5"
            />

            <XAxis
              dataKey="month"
              tick={{ fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="adoptions"
              stroke="#2563EB"
              strokeWidth={4}
              dot={{
                r: 6,
                fill: "#2563EB",
              }}
              activeDot={{
                r: 8,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AdoptionChart;