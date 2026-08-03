import { useState, useMemo } from "react";
import { FaSort, FaSortUp, FaSortDown, FaSearch, FaEllipsisV, FaChevronLeft, FaChevronRight, FaEye, FaEdit, FaTrash } from "react-icons/fa";

export interface Column {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  pageSize?: number;
  onView?: (row: Record<string, unknown>) => void;
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
}

const DataTable = ({
  columns,
  data,
  pageSize = 5,
  onView,
  onEdit,
  onDelete,
}: DataTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuRowIndex, setActiveMenuRowIndex] = useState<number | null>(null);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(lower);
      })
    );
  }, [data, searchTerm, columns]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      const compare = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      return sortDirection === "asc" ? compare : -compare;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderStatusBadge = (val: string) => {
    const lower = val.toLowerCase();
    let bg = "#F1F5F9";
    let color = "#475569";

    if (lower.includes("success") || lower.includes("completed") || lower.includes("approved") || lower.includes("healthy") || lower.includes("discharged")) {
      bg = "#ECFDF5"; color = "#10B981";
    } else if (lower.includes("pending") || lower.includes("treatment") || lower.includes("warning") || lower.includes("assigned")) {
      bg = "#FFFBEB"; color = "#F59E0B";
    } else if (lower.includes("critical") || lower.includes("failed") || lower.includes("urgent") || lower.includes("rejected")) {
      bg = "#FEF2F2"; color = "#EF4444";
    } else if (lower.includes("active") || lower.includes("in progress")) {
      bg = "#EFF6FF"; color = "#2563EB";
    }

    return (
      <span
        style={{
          background: bg,
          color: color,
          padding: "4px 10px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 700,
          display: "inline-block",
          textTransform: "capitalize",
        }}
      >
        {val}
      </span>
    );
  };

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      {/* Search Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", minWidth: "260px" }}>
          <FaSearch size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              background: "#F8FAFC",
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ fontSize: "13px", color: "#64748B" }}>
          Showing <strong>{pageData.length}</strong> of <strong>{sortedData.length}</strong> entries
        </div>
      </div>

      {/* Responsive Table Wrapper */}
      <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#FFFFFF", fontSize: "13px", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={{
                    padding: "14px 16px",
                    fontWeight: 700,
                    color: "#475569",
                    cursor: col.sortable !== false ? "pointer" : "default",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {col.title}
                    {col.sortable !== false && (
                      <span style={{ color: sortKey === col.key ? "#2563EB" : "#CBD5E1" }}>
                        {sortKey === col.key ? (sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />) : <FaSort />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {(onView || onEdit || onDelete) && (
                <th style={{ padding: "14px 16px", textAlign: "right", fontWeight: 700, color: "#475569" }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onView || onEdit || onDelete ? 1 : 0)} style={{ padding: "32px", textAlign: "center", color: "#94A3B8" }}>
                  No matching records found.
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: "1px solid #F1F5F9",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
                >
                  {columns.map((col) => {
                    const rawVal = row[col.key];
                    let content: React.ReactNode = String(rawVal ?? "");

                    if (col.render) {
                      content = col.render(rawVal, row);
                    } else if (col.key === "status" || col.key === "state" || col.key === "condition") {
                      content = renderStatusBadge(String(rawVal ?? ""));
                    }

                    return (
                      <td key={col.key} style={{ padding: "14px 16px", color: "#0F172A", verticalAlign: "middle" }}>
                        {content}
                      </td>
                    );
                  })}

                  {(onView || onEdit || onDelete) && (
                    <td style={{ padding: "14px 16px", textAlign: "right", position: "relative", verticalAlign: "middle" }}>
                      <button
                        onClick={() => setActiveMenuRowIndex(activeMenuRowIndex === idx ? null : idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#64748B",
                          padding: "6px",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <FaEllipsisV />
                      </button>

                      {activeMenuRowIndex === idx && (
                        <div
                          style={{
                            position: "absolute",
                            right: "16px",
                            top: "40px",
                            background: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            borderRadius: "10px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            zIndex: 50,
                            minWidth: "120px",
                            overflow: "hidden",
                          }}
                        >
                          {onView && (
                            <button
                              onClick={() => { onView(row); setActiveMenuRowIndex(null); }}
                              style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", color: "#0F172A", fontSize: "13px", cursor: "pointer", textAlign: "left" }}
                            >
                              <FaEye style={{ color: "#2563EB" }} /> View
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => { onEdit(row); setActiveMenuRowIndex(null); }}
                              style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", color: "#0F172A", fontSize: "13px", cursor: "pointer", textAlign: "left" }}
                            >
                              <FaEdit style={{ color: "#F59E0B" }} /> Edit
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => { onDelete(row); setActiveMenuRowIndex(null); }}
                              style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", color: "#EF4444", fontSize: "13px", cursor: "pointer", textAlign: "left" }}
                            >
                              <FaTrash /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", flexWrap: "wrap", gap: "12px" }}>
        <span style={{ fontSize: "13px", color: "#64748B" }}>
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
        </span>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              background: currentPage === 1 ? "#F1F5F9" : "#FFFFFF",
              color: currentPage === 1 ? "#94A3B8" : "#0F172A",
              fontSize: "13px",
              fontWeight: 600,
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
            }}
          >
            <FaChevronLeft size={11} /> Previous
          </button>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              background: currentPage === totalPages ? "#F1F5F9" : "#FFFFFF",
              color: currentPage === totalPages ? "#94A3B8" : "#0F172A",
              fontSize: "13px",
              fontWeight: 600,
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next <FaChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;