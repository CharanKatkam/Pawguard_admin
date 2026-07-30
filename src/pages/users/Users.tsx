import PageHeader from "../../components/common/PageHeader";
import UserFilter from "../../components/users/UserFilter";
import UserTable from "../../components/users/UserTable";

const Users = () => {
  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage all PawGuard users."
      />

      <UserFilter />

      <div style={{ marginTop: "25px" }}>
        <UserTable />
      </div>
    </>
  );
};

export default Users;