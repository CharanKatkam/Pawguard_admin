type AuthLayoutProps = {
  children: React.ReactNode;
};

const features = [
  "Shelter Management",
  "Rescue Operations",
  "Pet Adoptions",
  "Volunteer Network",
  "Medical Records",
  "Analytics Dashboard",
];

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(520px, 1fr) minmax(420px, 460px)",
        background: "#F8FAFC",
      }}
    >
      {/* Left Section */}
      <div
        style={{
          padding: "40px 50px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg,#0F172A 0%,#1E293B 60%,#334155 100%)",
        }}
      >
        <div style={{ maxWidth: "520px" }}>
          <span
            style={{
              display: "inline-block",
              padding: "10px 22px",
              borderRadius: "999px",
              background: "rgba(212,175,55,.12)",
              color: "#D4AF37",
              fontWeight: 600,
              fontSize: "14px",
              marginBottom: "24px",
            }}
          >
            Enterprise Security Portal
          </span>

          <h1
            style={{
              fontSize: "42px",
              fontWeight: 800,
              lineHeight: 1.15,
              margin: 0,
              marginBottom: "18px",
              letterSpacing: "-1px",
              color: "#FFFFFF",
            }}
          >
            PawGuard
            <br />
            Admin Portal
          </h1>

          <p
            style={{
              fontSize: "17px",
              lineHeight: 1.7,
              color: "#CBD5E1",
              marginBottom: "34px",
            }}
          >
            Securely manage animal rescues, shelters, volunteers,
            adoptions and reports from one centralized platform.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,1fr)",
              gap: "14px",
            }}
          >
            {features.map((item) => (
              <div
                key={item}
                style={{
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: "14px",
                  padding: "12px 16px",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#FFFFFF",
                }}
              >
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "32px",
          background: "#FFFFFF",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;