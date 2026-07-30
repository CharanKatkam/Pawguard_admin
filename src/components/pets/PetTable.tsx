import DataTable from "../common/DataTable";

const columns = [
  { key: "name", title: "Pet Name" },
  { key: "breed", title: "Breed" },
  { key: "age", title: "Age" },
  { key: "gender", title: "Gender" },
  { key: "status", title: "Status" },
];

const data = [
  {
    name: "Buddy",
    breed: "Golden Retriever",
    age: "2 Years",
    gender: "Male",
    status: "Available",
  },
  {
    name: "Lucy",
    breed: "Labrador",
    age: "1 Year",
    gender: "Female",
    status: "Adopted",
  },
];

const PetTable = () => {
  return <DataTable columns={columns} data={data} />;
};

export default PetTable;