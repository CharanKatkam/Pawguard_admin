import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaBoxes, FaPills, FaTruck, FaExclamationTriangle } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import { useDataSync } from "../../../utils/dataSync";

const InventoryManagerDashboard = () => {
  const navigate = useNavigate();
  const [inventoryData, setInventoryData] = useState<Record<string, unknown>[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getInventoryDashboard();
      const data = res?.data || res || {};
      setSummaryData(data);

      const itemsList = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.inventory)
        ? data.inventory
        : [];
      setInventoryData(itemsList);
    } catch (err: any) {
      console.error("Inventory Dashboard Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load inventory metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useDataSync(fetchInventory);

  const stats = [
    { title: "Total Inventory Units", value: loading ? "..." : String(summaryData?.total_items ?? summaryData?.totalItems ?? inventoryData.length), trend: "Categories", color: "#2563EB", icon: <FaBoxes /> },
    { title: "Medicines & Vaccines", value: loading ? "..." : String(summaryData?.medicines_stock ?? summaryData?.medicinesStock ?? "0"), trend: "Medical Stock", color: "#10B981", icon: <FaPills /> },
    { title: "Low Stock Alerts", value: loading ? "..." : String(summaryData?.low_stock_alerts ?? summaryData?.lowStockAlerts ?? "0"), trend: "Action Required", color: "#EF4444", icon: <FaExclamationTriangle /> },
    { title: "Active Vendors", value: loading ? "..." : String(summaryData?.active_vendors ?? summaryData?.activeVendors ?? "0"), trend: "Suppliers", color: "#6366F1", icon: <FaTruck /> },
  ];

  const columns = [
    { key: "sku", title: "SKU / Code" },
    { key: "itemName", title: "Item Name" },
    { key: "category", title: "Category" },
    { key: "stock", title: "Current Stock" },
    { key: "status", title: "Stock Status" },
    { key: "supplier", title: "Supplier" },
  ];

  const formattedInventory = inventoryData.map((item: any) => ({
    sku: item.id ?? item.sku ?? item.code ?? "",
    itemName: item.name ?? item.item_name ?? item.itemName ?? "",
    category: item.category ?? "",
    stock: item.stock !== undefined ? item.stock : item.quantity !== undefined ? item.quantity : "",
    status: item.status ?? "",
    supplier: item.supplier ?? item.vendor ?? "",
  }));

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Inventory & Stock Control Hub</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Inventory management: monitor pharmaceutical supplies, food kibble stock, medical equipment, and vendor purchase logs.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}


      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaBoxes />} title="Add Inventory Item" subtitle="Register new item" color="#2563EB" onClick={() => navigate("/inventory")} />
        <QuickActionCard icon={<FaTruck />} title="Issue Purchase Order" subtitle="Order from vendor" color="#10B981" onClick={() => navigate("/inventory")} />
        <QuickActionCard icon={<FaExclamationTriangle />} title="Low Stock Audit" subtitle="Review depleted items" color="#EF4444" onClick={() => navigate("/inventory")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
            Pharmaceutical & Supply Stock Catalog
          </h3>
          {loading && <span style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600 }}>Syncing stock catalog...</span>}
        </div>
        <DataTable columns={columns} data={formattedInventory} />

      </div>
    </div>
  );
};

export default InventoryManagerDashboard;
