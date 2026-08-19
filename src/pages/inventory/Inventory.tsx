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
  FaBoxOpen,
  FaEdit,
  FaMinusCircle,
} from "react-icons/fa";
import inventoryService, { type SupplierPayload } from "../../services/inventoryService";
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
  const [movements, setMovements] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRequisitions, setLoadingRequisitions] = useState<boolean>(false);
  const [loadingMovements, setLoadingMovements] = useState<boolean>(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<"all" | "low_stock" | "expiring_soon" | "expired" | "valid">("all");

  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Modals state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(() => searchParams.get("action") === "add");
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isReqListModalOpen, setIsReqListModalOpen] = useState(false);
  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
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

  const [editItemForm, setEditItemForm] = useState({
    id: "",
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

  const [issueForm, setIssueForm] = useState({
    item_id: "",
    quantity: 1,
    movement_type: "consumption" as "consumption" | "check_out",
    notes: "",
  });

  const [supplierForm, setSupplierForm] = useState<SupplierPayload>({
    id: "",
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
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
      const sortedReqs = [...list].sort((a: any, b: any) => {
        const timeA = new Date(a.created_at || a.date || a.timestamp || 0).getTime();
        const timeB = new Date(b.created_at || b.date || b.timestamp || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
      setRequisitions(sortedReqs);
    } catch {
      // Requisitions load fails quietly if none exist
    } finally {
      setLoadingRequisitions(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoadingSuppliers(true);
      const res = await inventoryService.getSuppliers();
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.items)
        ? res.items
        : [];
      setSuppliers(list);
    } catch {
      // safe catch
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  const fetchMovements = useCallback(async () => {
    try {
      setLoadingMovements(true);
      const invResponse = await inventoryService.getInventory();
      const itemsList = Array.isArray(invResponse?.data) ? invResponse.data : [];

      if (itemsList.length === 0) {
        setMovements([]);
        return;
      }

      const movementPromises = itemsList.slice(0, 15).map((item: any) =>
        inventoryService.getItemMovements(item.id || item.sku).catch(() => [])
      );

      const results = await Promise.allSettled(movementPromises);
      const combinedMovements: any[] = [];

      results.forEach((res, idx) => {
        if (res.status === "fulfilled" && res.value) {
          const list = Array.isArray(res.value)
            ? res.value
            : Array.isArray((res.value as any)?.data)
            ? (res.value as any).data
            : Array.isArray((res.value as any)?.items)
            ? (res.value as any).items
            : Array.isArray((res.value as any)?.movements)
            ? (res.value as any).movements
            : [];

          const itemRef = itemsList[idx];
          list.forEach((m: any) => {
            combinedMovements.push({
              ...m,
              item_id: m.item_id || itemRef.id,
              item_name: m.item_name || m.item?.name || itemRef.itemName,
            });
          });
        }
      });

      combinedMovements.sort((a, b) => {
        const da = new Date(a.created_at || a.timestamp || a.date || 0).getTime();
        const db = new Date(b.created_at || b.timestamp || b.date || 0).getTime();
        return db - da;
      });

      setMovements(combinedMovements);
    } catch {
      // safe catch
    } finally {
      setLoadingMovements(false);
    }
  }, []);

  useEffect(() => {
    void fetchInventory();
    void fetchRequisitions();
    void fetchMovements();
    void fetchSuppliers();
  }, [fetchInventory, fetchRequisitions, fetchMovements, fetchSuppliers]);

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
      addToast(`Added item "${itemForm.itemName}" to inventory catalog!`, "success");
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
      fetchMovements();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to add inventory item.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemForm.id) return;
    try {
      setIsSubmitting(true);
      await inventoryService.updateInventoryItem(editItemForm.id, editItemForm);
      addToast(`Updated item details for "${editItemForm.itemName}"!`, "success");
      setIsEditModalOpen(false);
      setSelectedItem(null);
      fetchInventory();
      fetchMovements();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update item.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssueStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.item_id) {
      addToast("Please select an item to issue.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await inventoryService.issueStockItem(issueForm.item_id, issueForm.quantity, issueForm.movement_type, issueForm.notes);
      addToast(`Dispensed ${issueForm.quantity} units of stock!`, "success");
      setIsIssueModalOpen(false);
      setIssueForm({ item_id: "", quantity: 1, movement_type: "consumption", notes: "" });
      fetchInventory();
      fetchMovements();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to dispense stock.";
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
      fetchMovements();
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
      fetchMovements();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update status.";
      addToast(msg, "error");
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name) {
      addToast("Supplier name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      if (supplierForm.id) {
        await inventoryService.updateSupplier(supplierForm.id, supplierForm);
        addToast(`Updated supplier "${supplierForm.name}"!`, "success");
      } else {
        await inventoryService.createSupplier(supplierForm);
        addToast(`Registered supplier "${supplierForm.name}"!`, "success");
      }
      setSupplierForm({ id: "", name: "", contact_person: "", email: "", phone: "", address: "", notes: "" });
      fetchSuppliers();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to save supplier.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    try {
      await inventoryService.deleteSupplier(id);
      addToast(`Deleted supplier "${name}"`, "success");
      fetchSuppliers();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete supplier.";
      addToast(msg, "error");
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
      fetchMovements();
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
    {
      key: "actions",
      title: "Actions",
      render: (_: unknown, row: InventoryRow) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <Can permission={["edit_inventory", "inventory:update", "update_inventory"]}>
            <button
              onClick={() => {
                setSelectedItem(row);
                setEditItemForm({
                  id: String(row.id || row.sku),
                  itemName: String(row.itemName),
                  category: String(row.category || "Medicines"),
                  stock: String(row.quantity ?? numericValue(row.stock)),
                  threshold: String(row.reorder_threshold ?? numericValue(row.threshold)),
                  supplier: String(row.supplier || ""),
                  expiry_date: String(row.expiry_date || ""),
                  unit_cost: row.unit_cost !== undefined ? String(row.unit_cost) : "",
                });
                setIsEditModalOpen(true);
              }}
              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <FaEdit /> Edit Item
            </button>
          </Can>
          <Can permission={["delete_inventory", "inventory:delete"]}>
            <button
              onClick={() => {
                setSelectedItem(row);
                setIsDeleteModalOpen(true);
              }}
              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              Delete
            </button>
          </Can>
        </div>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission={["create_inventory", "inventory:create"]}>
          <QuickActionCard icon={<FaPlusCircle />} title="Add Stock Item" subtitle="Register batch & expiry" color="#2563EB" onClick={() => setIsAddItemModalOpen(true)} />
        </Can>
        <Can permission={["create_inventory", "inventory:create"]}>
          <QuickActionCard icon={<FaMinusCircle />} title="Dispense / Issue Stock" subtitle="Dispense clinic / shelter stock" color="#D97706" onClick={() => setIsIssueModalOpen(true)} />
        </Can>
        <Can permission={["create_inventory", "inventory:create"]}>
          <QuickActionCard icon={<FaTruck />} title="Issue Purchase Order" subtitle="Order supplies from vendor" color="#10B981" onClick={() => setIsPoModalOpen(true)} />
        </Can>
        <Can permission={["view_inventory", "inventory:read"]}>
          <QuickActionCard icon={<FaTruck />} title="Supplier Roster" subtitle="Manage vendors & contacts" color="#8B5CF6" onClick={() => setIsSupplierModalOpen(true)} />
        </Can>
        <Can permission={["view_inventory", "inventory:read"]}>
          <QuickActionCard icon={<FaClipboardList />} title="Requisition Orders" subtitle="Manage PO statuses" color="#6366F1" onClick={() => setIsReqListModalOpen(true)} />
        </Can>
        <Can permission={["view_inventory", "inventory:read"]}>
          <QuickActionCard icon={<FaSync />} title="Stock Movement Log" subtitle="Audit stock movements" color="#0284C7" onClick={() => { fetchMovements(); setIsMovementsModalOpen(true); }} />
        </Can>
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

        <DataTable columns={columns} data={filteredInventory} loading={loading} emptyMessage="No inventory items match the selected filter." />
      </div>

      {/* Add Item Modal */}
      <Modal isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} title="Register New Inventory Item">
        <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Item Name *</label>
            <input type="text" required placeholder="e.g. Amoxicillin 500mg, Rabies Vaccine" value={itemForm.itemName} onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Category</label>
              <select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
                <option value="Medicines">Medicines</option>
                <option value="Vaccines">Vaccines</option>
                <option value="Food &amp; Nutrition">Food &amp; Nutrition</option>
                <option value="Supplies">Supplies</option>
                <option value="Gear">Gear</option>
                <option value="Office">Office</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Initial Quantity</label>
              <input type="text" placeholder="e.g. 50 Vials, 100 kg" value={itemForm.stock} onChange={(e) => setItemForm({ ...itemForm, stock: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Reorder Threshold</label>
              <input type="text" placeholder="e.g. 10" value={itemForm.threshold} onChange={(e) => setItemForm({ ...itemForm, threshold: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Unit Cost ($)</label>
              <input type="number" step="0.01" min="0" placeholder="e.g. 12.50" value={itemForm.unit_cost} onChange={(e) => setItemForm({ ...itemForm, unit_cost: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Batch Expiry Date</label>
            <input type="date" value={itemForm.expiry_date} onChange={(e) => setItemForm({ ...itemForm, expiry_date: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAddItemModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Item Modal (PUT /api/v1/inventory/items/{item_id}) */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Inventory Stock Item">
        <form onSubmit={handleEditItemSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Item Name *</label>
            <input type="text" required value={editItemForm.itemName} onChange={(e) => setEditItemForm({ ...editItemForm, itemName: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Category</label>
              <select value={editItemForm.category} onChange={(e) => setEditItemForm({ ...editItemForm, category: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
                <option value="Medicines">Medicines</option>
                <option value="Vaccines">Vaccines</option>
                <option value="Food &amp; Nutrition">Food &amp; Nutrition</option>
                <option value="Supplies">Supplies</option>
                <option value="Gear">Gear</option>
                <option value="Office">Office</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Quantity</label>
              <input type="number" min="0" required value={editItemForm.stock} onChange={(e) => setEditItemForm({ ...editItemForm, stock: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Reorder Threshold</label>
              <input type="number" min="0" value={editItemForm.threshold} onChange={(e) => setEditItemForm({ ...editItemForm, threshold: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Unit Cost ($)</label>
              <input type="number" step="0.01" min="0" value={editItemForm.unit_cost} onChange={(e) => setEditItemForm({ ...editItemForm, unit_cost: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Batch Expiry Date</label>
            <input type="date" value={editItemForm.expiry_date} onChange={(e) => setEditItemForm({ ...editItemForm, expiry_date: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Issue / Dispense Modal (POST /api/v1/inventory/movements with movement_type=consumption or check_out) */}
      <Modal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} title="Dispense / Issue Stock">
        <form onSubmit={handleIssueStockSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Stock Item *</label>
            <select required value={issueForm.item_id} onChange={(e) => setIssueForm({ ...issueForm, item_id: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
              <option value="">-- Choose Item --</option>
              {inventory.map((i) => (
                <option key={i.id || i.sku} value={i.id || i.sku}>
                  {i.itemName} (Available: {i.stock})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Quantity *</label>
              <input type="number" min="1" required value={issueForm.quantity} onChange={(e) => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Movement Type</label>
              <select value={issueForm.movement_type} onChange={(e) => setIssueForm({ ...issueForm, movement_type: e.target.value as any })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
                <option value="consumption">Clinic Consumption</option>
                <option value="check_out">Check Out / Dispatch</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Reason / Notes</label>
            <input type="text" placeholder="e.g. Dispensed for Dog Surgery #124" value={issueForm.notes} onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsIssueModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#D97706", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Dispensing..." : "Dispense Stock"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier / Vendor Roster Modal */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="Vendor & Supplier Management" size="lg">
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Add / Edit Supplier Form */}
          <form onSubmit={handleSaveSupplier} style={{ background: "#F8FAFC", padding: "16px", borderRadius: "10px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ margin: 0, color: "#0F172A", fontSize: "14px", fontWeight: 700 }}>
              {supplierForm.id ? "Edit Supplier Details" : "Register New Supplier"}
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Supplier Name *</label>
                <input type="text" required placeholder="e.g. Apex Pharma Supply" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Contact Person</label>
                <input type="text" placeholder="e.g. Rajesh Kumar" value={supplierForm.contact_person || ""} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Email Address</label>
                <input type="email" placeholder="orders@apexpharma.com" value={supplierForm.email || ""} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Phone Number</label>
                <input type="text" placeholder="+91 9876543210" value={supplierForm.phone || ""} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              {supplierForm.id && (
                <button type="button" onClick={() => setSupplierForm({ id: "", name: "", contact_person: "", email: "", phone: "", address: "", notes: "" })} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF", fontSize: "12px" }}>
                  Cancel Edit
                </button>
              )}
              <button type="submit" disabled={isSubmitting} style={{ padding: "6px 14px", borderRadius: "6px", border: "none", background: "#8B5CF6", color: "#FFF", fontSize: "12px", fontWeight: 700 }}>
                {isSubmitting ? "Saving..." : supplierForm.id ? "Update Supplier" : "Register Supplier"}
              </button>
            </div>
          </form>

          {/* Supplier Roster Table */}
          <div>
            <h4 style={{ margin: "0 0 10px", color: "#0F172A", fontSize: "14px", fontWeight: 700 }}>Active Registered Suppliers ({suppliers.length})</h4>

            {loadingSuppliers ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#8B5CF6" }}>Loading suppliers...</div>
            ) : suppliers.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#64748B" }}>No suppliers registered yet.</div>
            ) : (
              <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {suppliers.map((s: any) => (
                  <div key={s.id} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0F172A" }}>{s.name}</div>
                      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                        {s.contact_person ? `Contact: ${s.contact_person} | ` : ""}
                        {s.email ? `${s.email} | ` : ""}
                        {s.phone || ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Can permission={["edit_inventory", "inventory:update"]}>
                        <button onClick={() => setSupplierForm(s)} style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #CBD5E1", background: "#EFF6FF", color: "#1D4ED8", fontSize: "11px", fontWeight: 600 }}>
                          Edit
                        </button>
                      </Can>
                      <Can permission={["delete_inventory", "inventory:delete"]}>
                        <button onClick={() => handleDeleteSupplier(s.id, s.name)} style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 600 }}>
                          Delete
                        </button>
                      </Can>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setIsSupplierModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* PO / Requisition Issue Modal */}
      <Modal isOpen={isPoModalOpen} onClose={() => setIsPoModalOpen(false)} title="Issue Vendor Purchase Requisition">
        <form onSubmit={handleCreatePo} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Stock Item *</label>
            <select required value={poForm.item_id} onChange={(e) => setPoForm({ ...poForm, item_id: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
              <option value="">-- Choose Item --</option>
              {inventory.map((i) => (
                <option key={i.id || i.sku} value={i.id || i.sku}>
                  {i.itemName} (Current: {i.stock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Requisition Quantity *</label>
            <input type="number" min="1" required value={poForm.quantity} onChange={(e) => setPoForm({ ...poForm, quantity: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsPoModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Issuing..." : "Issue Requisition"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Requisitions List Modal */}
      <Modal isOpen={isReqListModalOpen} onClose={() => setIsReqListModalOpen(false)} title="Active Purchase Requisitions" size="lg">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, color: "#64748B", fontSize: "13px" }}>
            Live status of requisitions issued via `GET /api/v1/inventory/requisitions`.
          </p>

          {loadingRequisitions ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#2563EB" }}>Loading requisitions...</div>
          ) : requisitions.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#64748B" }}>No requisitions logged yet.</div>
          ) : (
            <div style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
              {requisitions.map((req: any, idx: number) => {
                const reqId = req.id || req._id || `REQ-${idx}`;
                const reqStatus = String(req.status || "pending").toLowerCase();
                const matchedItem = inventory.find((inv) => inv.id === req.item_id || inv.sku === req.item_id);

                return (
                  <div key={reqId} style={{ padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0F172A" }}>
                        Requisition #{String(reqId).slice(0, 8)} &bull; Qty: {req.quantity}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                        Item: {matchedItem ? matchedItem.itemName : req.item_id || "Stock Item"} | Issued: {req.created_at ? formatDateTime(req.created_at) : "Recent"}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "4px 10px",
                          borderRadius: "999px",
                          background: reqStatus === "received" ? "#D1FAE5" : reqStatus === "approved" ? "#DBEAFE" : reqStatus === "rejected" ? "#FEE2E2" : "#FEF3C7",
                          color: reqStatus === "received" ? "#065F46" : reqStatus === "approved" ? "#1E40AF" : reqStatus === "rejected" ? "#991B1B" : "#92400E",
                        }}
                      >
                        {reqStatus.toUpperCase()}
                      </span>

                      <Can permission={["edit_inventory", "inventory:update"]}>
                        {reqStatus === "pending" && (
                          <button onClick={() => handleUpdateRequisitionStatus(reqId, "approved")} style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                            Approve
                          </button>
                        )}
                        {reqStatus === "approved" && (
                          <button onClick={() => handleUpdateRequisitionStatus(reqId, "received")} style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                            <FaBoxOpen /> Receive Stock
                          </button>
                        )}
                      </Can>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setIsReqListModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Stock Movement History Modal */}
      <Modal isOpen={isMovementsModalOpen} onClose={() => setIsMovementsModalOpen(false)} title="Stock Movement & Audit History" size="lg">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, color: "#64748B", fontSize: "13px" }}>
            Real-time backend audit log of item stock movements fetched via item endpoints (`GET /api/v1/inventory/items/{`{item_id}`}/movements`).
          </p>

          {loadingMovements ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#2563EB", fontWeight: 600 }}>Syncing stock movement logs...</div>
          ) : movements.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>No stock movements recorded yet. Stock adjustments will appear here automatically.</div>
          ) : (
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#F1F5F9", textAlign: "left", color: "#475569" }}>
                    <th style={{ padding: "10px", borderRadius: "6px 0 0 6px" }}>Date &amp; Time</th>
                    <th style={{ padding: "10px" }}>Item / ID</th>
                    <th style={{ padding: "10px" }}>Movement Type</th>
                    <th style={{ padding: "10px" }}>Quantity</th>
                    <th style={{ padding: "10px" }}>Reason / Notes</th>
                    <th style={{ padding: "10px", borderRadius: "0 6px 6px 0" }}>Logged By</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m: any, idx: number) => {
                    const rawType = String(m.movement_type || m.type || "adjustment").toLowerCase();
                    let badgeStyle = { bg: "#DBEAFE", color: "#1E40AF", text: "ADJUSTMENT" };
                    if (rawType.includes("in") || rawType.includes("receive") || rawType.includes("add")) {
                      badgeStyle = { bg: "#D1FAE5", color: "#065F46", text: "STOCK IN" };
                    } else if (rawType.includes("out") || rawType.includes("issue") || rawType.includes("use") || rawType.includes("consumption") || rawType.includes("check_out")) {
                      badgeStyle = { bg: "#FEF3C7", color: "#92400E", text: rawType.includes("check") ? "DISPATCHED" : "CONSUMPTION" };
                    }

                    const itemName = m.item_name || m.item?.name || inventory.find((inv) => inv.id === m.item_id || inv.sku === m.item_id)?.itemName || "Stock Item";

                    return (
                      <tr key={m.id || idx} style={{ borderBottom: "1px solid #E2E8F0" }}>
                        <td style={{ padding: "10px", color: "#64748B", fontSize: "12px", whiteSpace: "nowrap" }}>
                          {formatDateTime(m.created_at || m.timestamp || m.date)}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <div style={{ fontWeight: 700, color: "#0F172A" }}>{itemName}</div>
                          <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748B" }}>
                            {String(m.item_id || m.id || "").slice(0, 8)}
                          </div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: "999px",
                              background: badgeStyle.bg,
                              color: badgeStyle.color,
                            }}
                          >
                            {badgeStyle.text}
                          </span>
                        </td>
                        <td style={{ padding: "10px", fontWeight: 700, color: "#0F172A" }}>
                          {m.quantity !== undefined ? m.quantity : m.stock ?? "-"} {m.unit || ""}
                        </td>
                        <td style={{ padding: "10px", color: "#475569", fontSize: "12px" }}>
                          {m.notes || m.reason || "Manual stock adjustment"}
                        </td>
                        <td style={{ padding: "10px", color: "#64748B", fontSize: "12px" }}>
                          {m.performed_by || m.user_name || m.user?.full_name || "Inventory Manager"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setIsMovementsModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
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
                  <Can permission={["create_inventory", "inventory:create"]}>
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
                  </Can>
                </div>
              ))}
          </div>
        </div>
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
