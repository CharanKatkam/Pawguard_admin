import DataTable from "../common/DataTable";

const columns = [
  { key: "name", title: "Name" },
  { key: "email", title: "Email" },
  { key: "role", title: "Role" },
  { key: "status", title: "Status" },
];

const data = [
  {
    name: "John Doe",
    email: "john@example.com",
    role: "Admin",
    status: "Active",
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    role: "Volunteer",
    status: "Active",
  },
];

const UserTable = () => {
  return <DataTable columns={columns} data={data} />;
};

export default UserTable;