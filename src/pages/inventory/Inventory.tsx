import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import { FaBoxes, FaPills, FaTruck, FaExclamationTriangle, FaPlusCircle } from "react-icons/fa";
import inventoryService from "../../services/inventoryService";

const Inventory = () => {
  const [inventory, setInventory] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await inventoryService.getInventory();
        if (response && Array.isArray(response.data)) {
          setInventory(response.data);
        }
      } catch {
        // Handled by service fallback
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const stats = [
    { title: "Total Items", value: `${inventory.length || 1420} Items`, trend: "18 Categories", color: "#2563EB", icon: <FaBoxes /> },
    { title: "Medicines & Vaccines", value: "680 Stock", trend: "Sufficient", color: "#10B981", icon: <FaPills /> },
    { title: "Low Stock Alerts", value: "3 Items", trend: "Action Required", trendUp: false, color: "#EF4444", icon: <FaExclamationTriangle /> },
    { title: "Active Suppliers", value: "12 Vendors", trend: "Verified", color: "#6366F1", icon: <FaTruck /> },
  ];

  const columns = [
    { key: "sku", title: "Item Code / SKU" },
    { key: "itemName", title: "Item Name" },
    { key: "category", title: "Category" },
    { key: "stock", title: "Current Stock" },
    { key: "status", title: "Stock Status" },
    { key: "supplier", title: "Supplier" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Inventory & Supplies Management</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Monitor stock levels, manage medical supplies, reorder food kibble, and audit equipment across all rescue shelters.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaPlusCircle />} title="Add Stock Item" subtitle="Register new inventory item" color="#2563EB" onClick={() => alert("Add Stock Item modal")} />
        <QuickActionCard icon={<FaTruck />} title="Create Purchase Order" subtitle="Order supplies from vendor" color="#10B981" onClick={() => alert("Purchase Order modal")} />
        <QuickActionCard icon={<FaExclamationTriangle />} title="Low Stock Audit" subtitle="Review depleted items" color="#EF4444" onClick={() => alert("Low Stock Audit modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Stock Catalog & Reorder Status
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading inventory...</span>}
        </div>
        <DataTable columns={columns} data={inventory} onView={(r) => alert(`Item: ${r.itemName}`)} onEdit={(r) => alert(`Edit Item: ${r.itemName}`)} />
      </div>
    </div>
  );
};

export default Inventory;
