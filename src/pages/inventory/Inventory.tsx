import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import { FaBoxes, FaPills, FaTruck, FaExclamationTriangle, FaPlusCircle, FaTrash } from "react-icons/fa";
import inventoryService from "../../services/inventoryService";
import { notifyDataChanged } from "../../utils/dataSync";

const Inventory = () => {
  const [inventory, setInventory] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { addToast } = useToast();

  // Modals state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, _setSelectedItem] = useState<any | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    itemName: "",
    category: "Medicines",
    stock: "100 Vials",
    threshold: "20 Vials",
    supplier: "PharmaVet",
  });

  const [poForm, setPoForm] = useState({
    vendor: "PharmaVet",
    item: "Amoxicillin 500mg",
    quantity: 50,
  });

  const [editForm, setEditForm] = useState({
    itemName: "",
    category: "",
    stock: "",
    supplier: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.itemName) {
      addToast("Item name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await inventoryService.createInventoryItem(itemForm);
      addToast(`Added item "${itemForm.itemName}" to inventory!`, "success");
      setIsAddItemModalOpen(false);
      setItemForm({ itemName: "", category: "Medicines", stock: "100 Vials", threshold: "20 Vials", supplier: "PharmaVet" });
      fetchInventory();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to add inventory item.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await inventoryService.createPurchaseOrder(poForm);
      addToast(`Purchase Order issued for ${poForm.quantity} units of ${poForm.item}!`, "success");
      setIsPoModalOpen(false);
      fetchInventory();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to create purchase order.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      const id = selectedItem.id || selectedItem.sku;
      await inventoryService.updateInventoryItem(id, editForm);
      addToast(`Updated stock details for ${editForm.itemName}!`, "success");
      setIsEditModalOpen(false);
      fetchInventory();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update stock details.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      const id = selectedItem.id || selectedItem.sku;
      await inventoryService.deleteInventoryItem(id);
      addToast(`Deleted inventory item ${selectedItem.itemName}`, "success");
      setIsDeleteModalOpen(false);
      fetchInventory();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete inventory item.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const numericValue = (value: unknown): number => {
    const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const isLowStock = (item: Record<string, unknown>): boolean => {
    const status = String(item.status || "").toLowerCase();
    if (status.includes("low")) return true;
    const stock = numericValue(item.stock);
    const threshold = numericValue(item.threshold);
    if (threshold > 0 && stock <= threshold && stock >= 0) return true;
    return false;
  };

  const lowStockCount = inventory.filter(isLowStock).length;

  const medicineCount = inventory.filter(
    (item) =>
      String(item.category || "").toLowerCase().includes("medic") ||
      String(item.category || "").toLowerCase().includes("vaccin") ||
      String(item.category || "").toLowerCase().includes("drug") ||
      String(item.supplier || "").toLowerCase().includes("pharma")
  ).length;

  const supplierCount = new Set(
    inventory.map((item) => String(item.supplier || "").trim()).filter(Boolean)
  ).size;

  const stats = [
    { title: "Total Items", value: `${inventory.length} Items`, trend: "Catalog Items", color: "#2563EB", icon: <FaBoxes /> },
    { title: "Medicines & Vaccines", value: `${medicineCount} Stock`, trend: "Sufficient", color: "#10B981", icon: <FaPills /> },
    { title: "Low Stock Alerts", value: `${lowStockCount} Items`, trend: "Action Required", color: "#EF4444", icon: <FaExclamationTriangle /> },
    { title: "Active Suppliers", value: `${supplierCount} Suppliers`, trend: "Verified", color: "#6366F1", icon: <FaTruck /> },
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
        <QuickActionCard icon={<FaPlusCircle />} title="Add Stock Item" subtitle="Register new inventory item" color="#2563EB" onClick={() => setIsAddItemModalOpen(true)} />
        <QuickActionCard icon={<FaTruck />} title="Create Purchase Order" subtitle="Order supplies from vendor" color="#10B981" onClick={() => setIsPoModalOpen(true)} />
        <QuickActionCard icon={<FaExclamationTriangle />} title="Low Stock Audit" subtitle="Review depleted items" color="#EF4444" onClick={() => setIsAuditModalOpen(true)} />
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
        <DataTable
          columns={columns}
          data={inventory}
          onEdit={async (r) => {
            await inventoryService.updateInventoryItem(r.id || "1", r);
            fetchInventory();
          }}
          onDelete={async (r) => {
            await inventoryService.deleteInventoryItem(r.id || "1");
            fetchInventory();
          }}
        />
      </div>

      {/* Add Stock Item Modal */}
      <Modal isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} title="Register Inventory Item">
        <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Item Name *</label>
            <input type="text" required placeholder="e.g. Amoxicillin 500mg" value={itemForm.itemName} onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Category</label>
              <select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
                <option value="Medicines">Medicines</option>
                <option value="Food & Nutrition">Food & Nutrition</option>
                <option value="Vaccines">Vaccines</option>
                <option value="Surgical Tools">Surgical Tools</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Current Stock</label>
              <input type="text" value={itemForm.stock} onChange={(e) => setItemForm({ ...itemForm, stock: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAddItemModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Adding..." : "Add Stock Item"}</button>
          </div>
        </form>
      </Modal>

      {/* Create Purchase Order Modal */}
      <Modal isOpen={isPoModalOpen} onClose={() => setIsPoModalOpen(false)} title="Issue Vendor Purchase Order">
        <form onSubmit={handleCreatePo} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Vendor Name</label>
            <input type="text" value={poForm.vendor} onChange={(e) => setPoForm({ ...poForm, vendor: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Item Name</label>
            <input type="text" value={poForm.item} onChange={(e) => setPoForm({ ...poForm, item: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Quantity</label>
            <input type="number" min="1" value={poForm.quantity} onChange={(e) => setPoForm({ ...poForm, quantity: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsPoModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Issuing..." : "Issue Purchase Order"}</button>
          </div>
        </form>
      </Modal>

      {/* Low Stock Audit Modal */}
      <Modal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} title="Low Stock Depletion Audit">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Items below reorder thresholds:
          </p>
          <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {inventory
              .filter(isLowStock)
              .map((i, idx) => (
                <div key={idx} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #FCA5A5", background: "#FEF2F2", display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#991B1B" }}>{String(i.itemName || i.item_name || i.name || "")}</div>
                    <div style={{ fontSize: "12px", color: "#B91C1C" }}>SKU: {String(i.sku || "")} | Stock: {String(i.stock || i.quantity || "")}</div>
                  </div>
                  <button
                    onClick={() => {
                      setPoForm({
                        vendor: String(i.supplier || poForm.vendor),
                        item: String(i.itemName || i.item_name || i.name || poForm.item),
                        quantity: 50,
                      });
                      setIsAuditModalOpen(false);
                      setIsPoModalOpen(true);
                    }}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#EF4444", color: "#FFF", fontSize: "12px", fontWeight: 600 }}
                  >
                    Reorder
                  </button>
                </div>
              ))}
          </div>
        </div>
      </Modal>



      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Inventory Details">
        <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Item Name</label>
            <input type="text" value={editForm.itemName} onChange={(e) => setEditForm({ ...editForm, itemName: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Stock</label>
            <input type="text" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Stock Item">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to remove item <strong>{selectedItem?.itemName}</strong> ({selectedItem?.sku})?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={handleDeleteItem} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}><FaTrash /> Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;
