import PageHeader from "../../components/common/PageHeader";
import ShelterTable from "../../components/shelters/ShelterTable";

const Shelters = () => {
  return (
    <>
      <PageHeader
        title="Shelters"
        subtitle="Manage all registered shelters."
      />

      <ShelterTable />
    </>
  );
};

export default Shelters;