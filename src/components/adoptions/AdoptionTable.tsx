import DataTable from "../common/DataTable";

const columns = [
  { key: "pet", title: "Pet" },
  { key: "adopter", title: "Adopter" },
  { key: "date", title: "Applied On" },
  { key: "status", title: "Status" },
];

const data = [
  {
    pet: "Buddy",
    adopter: "John Doe",
    date: "29 Jul 2026",
    status: "Approved",
  },
  {
    pet: "Lucy",
    adopter: "Emma",
    date: "30 Jul 2026",
    status: "Pending",
  },
];

const AdoptionTable = () => {
  return <DataTable columns={columns} data={data} />;
};

export default AdoptionTable;