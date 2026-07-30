import PageHeader from "../../components/common/PageHeader";
import AdoptionTable from "../../components/adoptions/AdoptionTable";

const Adoptions = () => {
  return (
    <>
      <PageHeader
        title="Adoptions"
        subtitle="Manage adoption requests."
      />

      <AdoptionTable />
    </>
  );
};

export default Adoptions;