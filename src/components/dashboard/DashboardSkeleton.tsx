interface DashboardSkeletonProps {
  rows?: number;
}

const DashboardSkeleton = ({ rows = 4 }: DashboardSkeletonProps) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {Array.from({ length: rows }).map((_, idx) => (
      <div
        key={idx}
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "12px",
          padding: "14px 16px",
        }}
      >
        <div className="dash-shimmer" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="dash-shimmer" style={{ height: 13, width: "55%", borderRadius: 6 }} />
          <div className="dash-shimmer" style={{ height: 11, width: "80%", borderRadius: 6, marginTop: 8 }} />
        </div>
        <div className="dash-shimmer" style={{ width: 48, height: 16, borderRadius: 8, flexShrink: 0 }} />
      </div>
    ))}
  </div>
);

export default DashboardSkeleton;
