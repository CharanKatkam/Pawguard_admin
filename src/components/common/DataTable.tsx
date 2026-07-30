interface Column {
  key: string;
  title: string;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
}

const DataTable = ({ columns, data }: DataTableProps) => {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        background: "#fff",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              style={{
                padding: "16px",
                textAlign: "left",
                borderBottom: "1px solid #E2E8F0",
                background: "#F8FAFC",
              }}
            >
              {column.title}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {columns.map((column) => (
              <td
                key={column.key}
                style={{
                  padding: "16px",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                {String(row[column.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default DataTable;