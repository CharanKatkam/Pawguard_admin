import PageHeader from "../../components/common/PageHeader";
import SettingsCard from "../../components/settings/SettingsCard";

const Settings = () => {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage your application settings."
      />

      <SettingsCard />
    </>
  );
};

export default Settings;