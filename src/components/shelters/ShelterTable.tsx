import DataTable from "../common/DataTable";

const columns = [
  { key: "name", title: "Shelter Name" },
  { key: "location", title: "Location" },
  { key: "capacity", title: "Capacity" },
  { key: "status", title: "Status" },
];

const data = [
  {
    name: "Happy Paws Shelter",
    location: "Hyderabad",
    capacity: "120",
    status: "Active",
  },
  {
    name: "Safe Haven",
    location: "Bangalore",
    capacity: "85",
    status: "Active",
  },
];

const ShelterTable = () => {
  return <DataTable columns={columns} data={data} />;
};

export default ShelterTable;