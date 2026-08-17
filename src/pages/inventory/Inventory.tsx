import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaBoxes,
  FaPills,
  FaTruck,
  FaExclamationTriangle,
  FaPlusCircle,
  FaTrash,
  FaCalendarTimes,
  FaClipboardList,
  FaSync,
  FaCheck,
  FaTimes,
  FaBoxOpen,
} from "react-icons/fa";
import inventoryService from "../../services/inventoryService";
import { notifyDataChanged } from "../../utils/dataSync";
import { formatDateTime } from "../../utils/dateUtils";

export interface InventoryRow {
  id: string;
  sku: string;
  itemName: string;
  category: string;
  stock: string;
  threshold: string;
  status: string;
  supplier: string;
  quantity: number;
  unit?: string;
  reorder_threshold: number;
  expiry_date?: string | null;
  unit_cost?: number;
  [key: string]: unknown;
}

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRequisitions, setLoadingRequisitions] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<"all" | "low_stock" | "expiring_soon" | "expired" | "valid">("all");

  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Modals state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(() => searchParams.get("action") === "add");
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isReqListModalOpen, setIsReqListModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryRow | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    itemName: "",
    category: "Medicines",
    stock: "",
    threshold: "10",
    supplier: "",
    expiry_date: "",
    unit_cost: "",
  });

  const [poForm, setPoForm] = useState({
    item_id: "",
    quantity: 10,
  });

  const [editForm, setEditForm] = useState({
    itemName: "",
    stock: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getInventory();
      if (response && Array.isArray(response.data)) {
        setInventory(response.data as InventoryRow[]);
      }
    } catch {
      addToast("Failed to load inventory stock catalog.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchRequisitions = useCallback(async () => {
    try {
      setLoadingRequisitions(true);
      const res = await inventoryService.getRequisitions();
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.items)
        ? res.items
        : [];
      setRequisitions(list);
    } catch {
      // Requisition load fails quietly if no requisitions exist yet
    } finally {
      setLoadingRequisitions(false);
    }
  }, []);

  useEffect(() => {
    void fetchInventory();
    void fetchRequisitions();
  }, [fetchInventory, fetchRequisitions]);

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.itemName) {
      addToast("Item name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await inventoryService.createInventoryItem(itemForm);
      addToast(`Added item "${itemForm.itemName}" to inventory batch catalog!`, "success");
      setIsAddItemModalOpen(false);
      setItemForm({
        itemName: "",
        category: "Medicines",
        stock: "",
        threshold: "10",
        supplier: "",
        expiry_date: "",
        unit_cost: "",
      });
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
    if (!poForm.item_id) {
      addToast("Please select an inventory item to reorder.", "error");
      return;
    }
    if (!poForm.quantity || poForm.quantity <= 0) {
      addToast("Please enter a quantity greater than zero.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await inventoryService.createPurchaseOrder(poForm);
      addToast(`Requisition issued for ${poForm.quantity} units!`, "success");
      setIsPoModalOpen(false);
      setPoForm({ item_id: "", quantity: 10 });
      fetchInventory();
      fetchRequisitions();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Failed to issue requisition.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRequisitionStatus = async (
    reqId: string,
    status: "pending" | "approved" | "rejected" | "received"
  ) => {
    try {
      await inventoryService.updateRequisitionStatus(reqId, status);
      addToast(`Requisition status updated to ${status.toUpperCase()}!`, "success");
      fetchRequisitions();
      fetchInventory();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update status.";
      addToast(msg, "error");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      const id = selectedItem.id || selectedItem.sku;
      await inventoryService.updateInventoryItem(id, { quantity: Number(editForm.stock) });
      addToast(`Stock adjusted for ${editForm.itemName}!`, "success");
      setIsEditModalOpen(false);
      setSelectedItem(null);
      fetchInventory();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Failed to adjust stock.";
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

  // Expiry Calculations
  const getExpiryInfo = (expiryStr?: string | null) => {
    if (!expiryStr) return { status: "NO EXPIRY", diffDays: 999, color: "#64748B", bg: "#F1F5F9" };
    const expDate = new Date(expiryStr);
    const now = new Date();
    expDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: "EXPIRED", diffDays, color: "#991B1B", bg: "#FEE2E2", border: "#FCA5A5" };
    }
    if (diffDays <= 30) {
      return { status: "EXPIRING SOON", diffDays, color: "#92400E", bg: "#FEF3C7", border: "#FDE68A" };
    }
    return { status: "VALID", diffDays, color: "#065F46", bg: "#D1FAE5", border: "#A7F3D0" };
  };

  const numericValue = (value: unknown): number => {
    const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const isLowStock = (item: InventoryRow): boolean => {
    const status = String(item.status || "").toLowerCase();
    if (status.includes("low")) return true;
    const stock = item.quantity ?? numericValue(item.stock);
    const threshold = item.reorder_threshold ?? numericValue(item.threshold);
    if (threshold > 0 && stock <= threshold && stock >= 0) return true;
    return false;
  };

  const lowStockCount = inventory.filter(isLowStock).length;
  const expiredCount = inventory.filter((i) => getExpiryInfo(i.expiry_date).status === "EXPIRED").length;
  const expiringSoonCount = inventory.filter((i) => getExpiryInfo(i.expiry_date).status === "EXPIRING SOON").length;

  const medicineCount = inventory.filter(
    (item) =>
      String(item.category || "").toLowerCase().includes("medic") ||
      String(item.category || "").toLowerCase().includes("vaccin") ||
      String(item.category || "").toLowerCase().includes("drug") ||
      String(item.supplier || "").toLowerCase().includes("pharma")
  ).length;

  // Filtered inventory based on tab
  const filteredInventory = inventory.filter((item) => {
    if (filterTab === "low_stock") return isLowStock(item);
    if (filterTab === "expiring_soon") return getExpiryInfo(item.expiry_date).status === "EXPIRING SOON";
    if (filterTab === "expired") return getExpiryInfo(item.expiry_date).status === "EXPIRED";
    if (filterTab === "valid") return getExpiryInfo(item.expiry_date).status === "VALID";
    return true;
  });

  const stats = [
    { title: "Total Catalog Items", value: `${inventory.length} Items`, trend: "Active batches", color: "#2563EB", icon: <FaBoxes /> },
    { title: "Medicines & Vaccines", value: `${medicineCount} Stock`, trend: "Pharmacy supply", color: "#10B981", icon: <FaPills /> },
    { title: "Low Stock Alerts", value: `${lowStockCount} Items`, trend: "Reorder required", color: "#EF4444", icon: <FaExclamationTriangle /> },
    { title: "Expiring / Expired", value: `${expiredCount + expiringSoonCount} Items`, trend: `${expiredCount} Expired, ${expiringSoonCount} Soon`, color: "#F59E0B", icon: <FaCalendarTimes /> },
  ];

  const columns = [
    {
      key: "sku",
      title: "Batch / Item UUID",
      render: (v: string) => <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#64748B" }}>{v ? String(v).slice(0, 13) : "-"}</span>,
    },
    {
      key: "itemName",
      title: "Item Name",
      render: (v: string, row: InventoryRow) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{v}</div>
          {row.unit_cost !== undefined && row.unit_cost !== null && (
            <div style={{ fontSize: "11px", color: "#64748B" }}>Unit Cost: ${Number(row.unit_cost).toFixed(2)}</div>
          )}
        </div>
      ),
    },
    { key: "category", title: "Category" },
    {
      key: "stock",
      title: "Stock & Reorder",
      render: (v: string, row: InventoryRow) => (
        <div>
          <div style={{ fontWeight: 700, color: isLowStock(row) ? "#DC2626" : "#0F172A" }}>{v}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Min: {row.threshold}</div>
        </div>
      ),
    },
    {
      key: "expiry_date",
      title: "Batch Expiry",
      render: (v: string | null) => {
        const info = getExpiryInfo(v);
        return (
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>{v ? formatDateTime(v) : "N/A"}</div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: "4px",
                background: info.bg,
                color: info.color,
                border: info.border ? `1px solid ${info.border}` : "none",
                display: "inline-block",
                marginTop: "2px",
              }}
            >
              {info.status}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      title: "Stock Status",
      render: (_: string, row: InventoryRow) => (
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: "999px",
            background: isLowStock(row) ? "#FEE2E2" : "#D1FAE5",
            color: isLowStock(row) ? "#991B1B" : "#065F46",
          }}
        >
          {isLowStock(row) ? "LOW STOCK" : "IN STOCK"}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Inventory, Pharmacy &amp; Batch Management</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Real-time backend stock control, batch-level expiry date monitoring, low-stock reorder automation, and supplier requisitions.
        </p>
      </div>

      {/* Expiry / Depletion Alert Warning Banner */}
      {(expiredCount > 0 || expiringSoonCount > 0 || lowStockCount > 0) && (
        <div
          style={{
            background: expiredCount > 0 ? "#FEF2F2" : "#FFFBEB",
            border: expiredCount > 0 ? "1px solid #FCA5A5" : "1px solid #FCD34D",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <FaExclamationTriangle color={expiredCount > 0 ? "#DC2626" : "#D97706"} size={22} />
            <div>
              <div style={{ fontWeight: 800, color: expiredCount > 0 ? "#991B1B" : "#92400E", fontSize: "14px" }}>
                {expiredCount > 0 ? "CRITICAL: Expired Medical Batches Detected" : "WARNING: Stock Depletion & Expiry Alerts"}
              </div>
              <div style={{ fontSize: "13px", color: expiredCount > 0 ? "#B91C1C" : "#B45309", marginTop: "2px" }}>
                {expiredCount} items expired &bull; {expiringSoonCount} items expiring within 30 days &bull; {lowStockCount} items below reorder threshold.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setFilterTab("expired")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                background: "#DC2626",
                color: "#FFF",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              View Expired ({expiredCount})
            </button>
            <button
              onClick={() => setFilterTab("expiring_soon")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                background: "#D97706",
                color: "#FFF",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Expiring Soon ({expiringSoonCount})
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="create_inventory">
          <QuickActionCard icon={<FaPlusCircle />} title="Add Stock Item" subtitle="Register batch & expiry" color="#2563EB" onClick={() => setIsAddItemModalOpen(true)} />
        </Can>
        <Can permission="create_inventory">
          <QuickActionCard icon={<FaTruck />} title="Issue Purchase Order" subtitle="Order supplies from vendor" color="#10B981" onClick={() => setIsPoModalOpen(true)} />
        </Can>
        <QuickActionCard icon={<FaClipboardList />} title="Requisition Orders" subtitle="Manage PO statuses" color="#6366F1" onClick={() => setIsReqListModalOpen(true)} />
        <QuickActionCard icon={<FaExclamationTriangle />} title="Low Stock Audit" subtitle="Review depleted items" color="#EF4444" onClick={() => setIsAuditModalOpen(true)} />
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Main Catalog Card */}
      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Batch Stock Catalog &amp; Expiry Visibility
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Showing {filteredInventory.length} of {inventory.length} total items
            </span>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Items", count: inventory.length },
              { id: "low_stock", label: "Low Stock", count: lowStockCount, color: "#DC2626" },
              { id: "expiring_soon", label: "Expiring (<=30 Days)", count: expiringSoonCount, color: "#D97706" },
              { id: "expired", label: "Expired", count: expiredCount, color: "#991B1B" },
              { id: "valid", label: "Valid", count: inventory.length - expiredCount - expiringSoonCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: filterTab === tab.id ? "1px solid #2563EB" : "1px solid #CBD5E1",
                  background: filterTab === tab.id ? "#EFF6FF" : "#FFFFFF",
                  color: filterTab === tab.id ? "#1D4ED8" : "#475569",
                  fontSize: "12px",
                  fontWeight: filterTab === tab.id ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "#64748B", padding: "20px 0" }}>Loading live backend inventory data...</p>
        ) : (
          <DataTable
            columns={columns}
            data={filteredInventory}
            module="inventory"
            onEdit={(r) => {
              setSelectedItem(r as InventoryRow);
              const parsed = numericValue(r.stock);
              setEditForm({
                itemName: String(r.itemName || r.name || ""),
                stock: parsed ? String(parsed) : "",
              });
              setIsEditModalOpen(true);
            }}
            onDelete={(r) => {
              setSelectedItem(r as InventoryRow);
              setIsDeleteModalOpen(true);
            }}
          />
        )}
      </div>

      {/* Add Stock Item Modal */}
      <Modal isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} title="Register Inventory Stock Item & Batch">
        <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Item Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rabies Vaccine Vials 10ml"
              value={itemForm.itemName}
              onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Category *</label>
              <select
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
              >
                <option value="Medicines">Medicines / Pharmaceuticals</option>
                <option value="Vaccines">Vaccines &amp; Biologicals</option>
                <option value="Food &amp; Nutrition">Food &amp; Nutrition</option>
                <option value="Supplies">General Supplies</option>
                <option value="Surgical Tools">Gear &amp; Surgical Tools</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Initial Stock Quantity *</label>
              <input
                type="number"
                min="0"
                required
                placeholder="e.g. 50"
                value={itemForm.stock}
                onChange={(e) => setItemForm({ ...itemForm, stock: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Reorder Threshold</label>
              <input
                type="number"
                min="0"
                placeholder="Default: 10"
                value={itemForm.threshold}
                onChange={(e) => setItemForm({ ...itemForm, threshold: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Batch Expiry Date</label>
              <input
                type="date"
                value={itemForm.expiry_date}
                onChange={(e) => setItemForm({ ...itemForm, expiry_date: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Unit Cost ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 4.50"
                value={itemForm.unit_cost}
                onChange={(e) => setItemForm({ ...itemForm, unit_cost: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAddItemModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Adding..." : "Add Stock Item"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Purchase Order Modal */}
      <Modal isOpen={isPoModalOpen} onClose={() => setIsPoModalOpen(false)} title="Issue Purchase / Requisition Order">
        <form onSubmit={handleCreatePo} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Catalog Item *</label>
            <select
              required
              value={poForm.item_id}
              onChange={(e) => setPoForm({ ...poForm, item_id: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
            >
              <option value="">Select an item...</option>
              {inventory.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.itemName} (Current Stock: {i.stock})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Requisition Quantity *</label>
            <input
              type="number"
              min="1"
              required
              value={poForm.quantity || ""}
              onChange={(e) => setPoForm({ ...poForm, quantity: Number(e.target.value) })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsPoModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Issuing..." : "Issue Requisition Order"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Requisition Orders List & Status Update Modal */}
      <Modal isOpen={isReqListModalOpen} onClose={() => setIsReqListModalOpen(false)} title="Supplier Requisition & Purchase Orders" maxWidth="720px">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ color: "#475569", margin: 0, fontSize: "14px" }}>
              Authoritative backend purchase orders and stock replenishment status:
            </p>
            <button
              onClick={() => void fetchRequisitions()}
              disabled={loadingRequisitions}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                background: "#F8FAFC",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <FaSync style={{ animation: loadingRequisitions ? "spin 1s linear infinite" : "none" }} /> Refresh Orders
            </button>
          </div>

          {loadingRequisitions ? (
            <p style={{ color: "#64748B" }}>Fetching purchase orders...</p>
          ) : requisitions.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", background: "#F8FAFC", borderRadius: "8px", color: "#64748B" }}>
              No purchase orders found on the server. Use "Issue Purchase Order" to create one.
            </div>
          ) : (
            <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
              {requisitions.map((req: any) => {
                const item = inventory.find((i) => i.id === req.item_id);
                const status = String(req.status || "pending").toLowerCase();
                const statusColor =
                  status === "approved" ? "#047857" : status === "received" ? "#1D4ED8" : status === "rejected" ? "#DC2626" : "#D97706";
                const statusBg =
                  status === "approved" ? "#D1FAE5" : status === "received" ? "#EFF6FF" : status === "rejected" ? "#FEE2E2" : "#FEF3C7";

                return (
                  <div
                    key={req.id}
                    style={{
                      padding: "14px",
                      borderRadius: "10px",
                      border: "1px solid #E2E8F0",
                      background: "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: "#0F172A", fontSize: "14px" }}>
                        {item ? item.itemName : `Item ID: ${req.item_id}`}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                        Qty: <strong>{req.quantity}</strong> &bull; Requisition ID: <span style={{ fontFamily: "monospace" }}>{req.id.slice(0, 8)}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                        Issued: {formatDateTime(req.created_at)}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "4px 10px",
                          borderRadius: "999px",
                          background: statusBg,
                          color: statusColor,
                          textTransform: "uppercase",
                        }}
                      >
                        {status}
                      </span>

                      {status === "pending" && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => void handleUpdateRequisitionStatus(req.id, "approved")}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              border: "none",
                              background: "#10B981",
                              color: "#FFF",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FaCheck /> Approve
                          </button>
                          <button
                            onClick={() => void handleUpdateRequisitionStatus(req.id, "rejected")}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              border: "none",
                              background: "#EF4444",
                              color: "#FFF",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FaTimes /> Reject
                          </button>
                        </div>
                      )}

                      {status === "approved" && (
                        <button
                          onClick={() => void handleUpdateRequisitionStatus(req.id, "received")}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "6px",
                            border: "none",
                            background: "#2563EB",
                            color: "#FFF",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <FaBoxOpen /> Receive Stock
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setIsReqListModalOpen(false)}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
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
                <div key={idx} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #FCA5A5", background: "#FEF2F2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#991B1B" }}>{String(i.itemName || i.item_name || i.name || "")}</div>
                    <div style={{ fontSize: "12px", color: "#B91C1C" }}>
                      SKU: {String(i.sku || "")} | Stock: <strong>{String(i.stock || i.quantity || "")}</strong> (Min: {i.threshold})
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPoForm({
                        item_id: String(i.id || i.sku || ""),
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
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Adjust Stock Level">
        <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Item Name</label>
            <input type="text" value={editForm.itemName} readOnly style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#475569" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>New Quantity *</label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={editForm.stock}
              onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
            />
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#64748B" }}>
              The backend records stock corrections as inventory movements (`POST /inventory/movements`).
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Saving..." : "Adjust Stock"}
            </button>
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
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteItem}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}
            >
              <FaTrash /> Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;
