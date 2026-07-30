interface PageHeaderProps {
  title: string;
  subtitle: string;
}

const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  return (
    <div style={{ marginBottom: "30px" }}>
      <h1
        style={{
          fontSize: "36px",
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: "8px",
        }}
      >
        {title}
      </h1>

      <p
        style={{
          color: "#64748B",
          fontSize: "16px",
          margin: 0,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
};

export default PageHeader;