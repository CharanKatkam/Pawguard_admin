import { useState, useEffect } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaBoxes, FaPills, FaTruck, FaExclamationTriangle } from "react-icons/fa";
import inventoryService from "../../../services/inventoryService";

const InventoryManagerDashboard = () => {
  const [inventoryData, setInventoryData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const res = await inventoryService.getInventory();
        if (res && Array.isArray(res.data)) {
          setInventoryData(res.data);
        }
      } catch {
        // Fallback handled by service
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const stats = [
    { title: "Total Inventory Units", value: `${inventoryData.length || 1420} Items`, trend: "18 Categories", color: "#2563EB", icon: <FaBoxes /> },
    { title: "Medicines & Vaccines", value: "680 Stock", trend: "Sufficient", color: "#10B981", icon: <FaPills /> },
    { title: "Low Stock Alerts", value: "3 Items", trend: "Action Required", trendUp: false, color: "#EF4444", icon: <FaExclamationTriangle /> },
    { title: "Active Vendors", value: "12 Suppliers", trend: "Verified", color: "#6366F1", icon: <FaTruck /> },
  ];

  const columns = [
    { key: "sku", title: "SKU / Code" },
    { key: "itemName", title: "Item Name" },
    { key: "category", title: "Category" },
    { key: "stock", title: "Current Stock" },
    { key: "status", title: "Stock Status" },
    { key: "supplier", title: "Supplier" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Inventory & Stock Control Hub</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Inventory management: monitor pharmaceutical supplies, food kibble stock, medical equipment, and vendor purchase logs.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaBoxes />} title="Add Inventory Item" subtitle="Register new item" color="#2563EB" onClick={() => alert("Add Item modal")} />
        <QuickActionCard icon={<FaTruck />} title="Issue Purchase Order" subtitle="Order from vendor" color="#10B981" onClick={() => alert("Purchase Order modal")} />
        <QuickActionCard icon={<FaExclamationTriangle />} title="Low Stock Audit" subtitle="Review depleted items" color="#EF4444" onClick={() => alert("Stock Audit modal")} />
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
        <DataTable columns={columns} data={inventoryData} />
      </div>
    </div>
  );
};

export default InventoryManagerDashboard;
