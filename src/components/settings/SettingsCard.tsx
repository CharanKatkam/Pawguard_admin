const SettingsCard = () => {
  return (
    <div
      style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,.08)",
      }}
    >
      <h2>Application Settings</h2>

      <ul style={{ lineHeight: "2" }}>
        <li>Profile Settings</li>
        <li>Change Password</li>
        <li>Notification Preferences</li>
        <li>Theme Settings</li>
      </ul>
    </div>
  );
};

export default SettingsCard;