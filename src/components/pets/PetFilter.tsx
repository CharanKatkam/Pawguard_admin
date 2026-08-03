import SearchInput from "../common/SearchInput";
import PrimaryButton from "../common/PrimaryButton";

const PetFilter = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
      }}
    >
      <SearchInput placeholder="Search pets..." />
      <PrimaryButton text="+ Add Pet" />
    </div>
  );
};

export default PetFilter;