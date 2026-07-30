interface SearchInputProps {
  placeholder?: string;
}

const SearchInput = ({
  placeholder = "Search...",
}: SearchInputProps) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      style={{
        width: "320px",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #CBD5E1",
        outline: "none",
        fontSize: "15px",
      }}
    />
  );
};

export default SearchInput;