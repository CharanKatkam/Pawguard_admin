import SearchInput from "../common/SearchInput";
import PrimaryButton from "../common/PrimaryButton";

const UserFilter = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
      }}
    >
      <SearchInput placeholder="Search users..." />

      <PrimaryButton text="+ Add User" />
    </div>
  );
};

export default UserFilter;