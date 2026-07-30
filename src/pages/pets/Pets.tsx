import PageHeader from "../../components/common/PageHeader";
import PetFilter from "../../components/pets/PetFilter";
import PetTable from "../../components/pets/PetTable";

const Pets = () => {
  return (
    <>
      <PageHeader
        title="Pets"
        subtitle="Manage all pets registered in PawGuard."
      />

      <PetFilter />

      <PetTable />
    </>
  );
};

export default Pets;