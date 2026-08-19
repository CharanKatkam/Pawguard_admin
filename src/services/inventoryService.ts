import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface InventoryItemPayload {
  id?: string;
  sku?: string;
  itemName: string;
  category: string;
  stock: string | number;
  threshold: string | number;
  status?: string;
  supplier?: string;
}

export interface SupplierPayload {
  id?: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Map frontend category labels to the ItemCategory enum. */
const toItemCategory = (category?: string): string => {
  const c = String(category || "").toLowerCase();
  if (c.includes("vaccin")) return "vaccine";
  if (c.includes("medic") || c.includes("drug") || c.includes("pharma")) return "pharmaceutical";
  if (c.includes("food") || c.includes("kibble") || c.includes("nutrition")) return "food";
  if (c.includes("surgical") || c.includes("tool") || c.includes("gear") || c.includes("equipment")) return "gear";
  if (c.includes("office")) return "office";
  return "consumable";
};

/** Map the ItemCategory enum back to a friendly display label. */
const fromItemCategory = (category?: string): string => {
  const c = String(category || "").toLowerCase();
  const map: Record<string, string> = {
    pharmaceutical: "Medicines",
    vaccine: "Vaccines",
    food: "Food & Nutrition",
    consumable: "Supplies",
    gear: "Gear",
    office: "Office",
  };
  return map[c] || c;
};

/** Parse a value like "100 Vials" or 50 into { quantity, unit }. */
const parseStock = (stock: string | number | undefined): { quantity: number; unit: string } => {
  const str = String(stock ?? "").trim();
  const match = str.match(/^([\d.,]+)\s*([a-zA-Z]+)?$/);
  if (match) {
    const quantity = Number(match[1].replace(/,/g, ""));
    const unit = (match[2] || "units").toLowerCase();
    return { quantity: Number.isFinite(quantity) ? quantity : 0, unit };
  }
  const n = Number(str);
  return { quantity: Number.isFinite(n) ? n : 0, unit: "units" };
};

/** Normalize a raw InventoryItemResponse row to the page shape. */
export const normalizeInventoryRow = (item: any): any => {
  const quantity = Number(item.quantity ?? 0);
  const threshold = Number(item.reorder_threshold ?? 0);
  return {
    id: item.id,
    sku: item.id,
    itemName: item.name,
    category: fromItemCategory(item.category),
    stock: `${quantity} ${item.unit || "units"}`,
    threshold: `${threshold} ${item.unit || "units"}`,
    status: threshold > 0 && quantity <= threshold ? "Low Stock" : "In Stock",
    supplier: item.supplier || item.supplier_name || item.vendor || "",
    quantity,
    unit: item.unit || "units",
    reorder_threshold: threshold,
    expiry_date: item.expiry_date,
    unit_cost: item.unit_cost,
  };
};

export const inventoryService = {
  // GET /api/v1/inventory/items
  getInventory: async (params?: Record<string, unknown>) => {
    const response = await api.get("/inventory/items", { params });
    const body = response.data;
    const raw = Array.isArray(body) ? body : body?.data;
    const rows = Array.isArray(raw) ? raw.map(normalizeInventoryRow) : [];
    return { ...body, data: rows, total: body?.meta?.total ?? rows.length };
  },

  // GET /api/v1/inventory/items/{item_id}
  getItemById: async (itemId: string) => {
    const response = await api.get(`/inventory/items/${itemId}`);
    return response.data?.data ?? response.data;
  },

  // POST /api/v1/inventory/items (InventoryItemCreate)
  createInventoryItem: async (data: Record<string, unknown>) => {
    const { quantity, unit } = parseStock(data.stock as string | number | undefined);
    const payload: Record<string, unknown> = {
      name: String(data.itemName || data.name || ""),
      category: toItemCategory(String(data.category || "consumable")),
      unit: unit || String(data.unit || "units"),
    };
    if (quantity > 0) payload.quantity = quantity;
    if (data.threshold !== undefined && data.threshold !== null && data.threshold !== "") {
      const t = parseStock(data.threshold as string | number | undefined);
      payload.reorder_threshold = t.quantity;
    }
    if (data.expiry_date) payload.expiry_date = data.expiry_date;
    if (data.unit_cost !== undefined && data.unit_cost !== null) payload.unit_cost = Number(data.unit_cost);
    if (data.supplier) payload.supplier = String(data.supplier);

    const response = await api.post("/inventory/items", payload);
    await publishActionEvent({
      module: "inventory",
      action: "create",
      title: "New Inventory Item Added",
      message: `Item ${payload.name} added to stock inventory.`,
      targetRoles: ["super_admin", "inventory_manager", "shelter_manager", "rescue_centre_admin"],
    });
    return response.data;
  },

  // PUT /api/v1/inventory/items/{item_id} - Update inventory item
  updateInventoryItem: async (itemId: string, data: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {};
    if (data.itemName || data.name) payload.name = String(data.itemName || data.name);
    if (data.category) payload.category = toItemCategory(String(data.category));
    if (data.stock !== undefined || data.quantity !== undefined) {
      const q = Number(data.quantity !== undefined ? data.quantity : parseStock(data.stock as any).quantity);
      if (Number.isFinite(q) && q >= 0) payload.quantity = q;
    }
    if (data.unit) payload.unit = String(data.unit);
    if (data.threshold !== undefined || data.reorder_threshold !== undefined) {
      const t = Number(data.reorder_threshold !== undefined ? data.reorder_threshold : parseStock(data.threshold as any).quantity);
      if (Number.isFinite(t)) payload.reorder_threshold = t;
    }
    if (data.expiry_date !== undefined) payload.expiry_date = data.expiry_date;
    if (data.unit_cost !== undefined && data.unit_cost !== null) payload.unit_cost = Number(data.unit_cost);
    if (data.supplier !== undefined) payload.supplier = String(data.supplier);

    const response = await api.put(`/inventory/items/${itemId}`, payload);
    await publishActionEvent({
      module: "inventory",
      action: "update",
      title: "Inventory Item Updated",
      message: `Item ${itemId} updated.`,
      targetRoles: ["super_admin", "inventory_manager", "shelter_manager"],
    });
    return response.data;
  },

  // POST /api/v1/inventory/movements with movement_type="consumption" or "check_out"
  issueStockItem: async (itemId: string, quantity: number, movement_type: "consumption" | "check_out" = "consumption", notes?: string) => {
    const response = await api.post("/inventory/movements", {
      item_id: itemId,
      movement_type: movement_type || "consumption",
      quantity: Number(quantity),
      notes: notes || "Stock dispensed / issued",
    });
    await publishActionEvent({
      module: "inventory",
      action: "update",
      title: "Stock Dispensed",
      message: `Issued ${quantity} units of item ${itemId} (${movement_type}).`,
      targetRoles: ["super_admin", "inventory_manager", "shelter_manager", "veterinarian"],
    });
    return response.data;
  },

  // DELETE /api/v1/inventory/items/{item_id}
  deleteInventoryItem: async (itemId: string) => {
    const response = await api.delete(`/inventory/items/${itemId}`);
    await publishActionEvent({
      module: "inventory",
      action: "delete",
      title: "Inventory Item Removed",
      message: `Inventory record ${itemId} deleted.`,
      targetRoles: ["super_admin", "inventory_manager"],
    });
    return response.data;
  },

  // POST /api/v1/inventory/items/bulk/delete
  bulkDeleteItems: async (itemIds: string[]) => {
    const response = await api.post("/inventory/items/bulk/delete", { item_ids: itemIds });
    await publishActionEvent({
      module: "inventory",
      action: "delete",
      title: "Bulk Inventory Items Deleted",
      message: `${itemIds.length} inventory items removed in bulk.`,
      targetRoles: ["super_admin", "inventory_manager"],
    });
    return response.data;
  },

  // GET /api/v1/inventory/items/{item_id}/movements
  getItemMovements: async (itemId: string, params?: Record<string, unknown>) => {
    const response = await api.get(`/inventory/items/${itemId}/movements`, { params });
    return response.data;
  },

  // Supplier Management APIs
  // GET /api/v1/inventory/suppliers
  getSuppliers: async (params?: Record<string, unknown>) => {
    const response = await api.get("/inventory/suppliers", { params });
    const body = response.data;
    const raw = Array.isArray(body) ? body : body?.data ?? body?.items ?? [];
    return { ...body, data: raw };
  },

  // GET /api/v1/inventory/suppliers/{id}
  getSupplierById: async (supplierId: string) => {
    const response = await api.get(`/inventory/suppliers/${supplierId}`);
    return response.data?.data ?? response.data;
  },

  // POST /api/v1/inventory/suppliers
  createSupplier: async (data: SupplierPayload) => {
    const response = await api.post("/inventory/suppliers", data);
    await publishActionEvent({
      module: "inventory",
      action: "create",
      title: "Supplier Registered",
      message: `Supplier ${data.name} added.`,
      targetRoles: ["super_admin", "inventory_manager"],
    });
    return response.data;
  },

  // PUT /api/v1/inventory/suppliers/{id}
  updateSupplier: async (supplierId: string, data: SupplierPayload) => {
    const response = await api.put(`/inventory/suppliers/${supplierId}`, data);
    await publishActionEvent({
      module: "inventory",
      action: "update",
      title: "Supplier Updated",
      message: `Supplier ${supplierId} details updated.`,
      targetRoles: ["super_admin", "inventory_manager"],
    });
    return response.data;
  },

  // DELETE /api/v1/inventory/suppliers/{id}
  deleteSupplier: async (supplierId: string) => {
    const response = await api.delete(`/inventory/suppliers/${supplierId}`);
    await publishActionEvent({
      module: "inventory",
      action: "delete",
      title: "Supplier Removed",
      message: `Supplier ${supplierId} deleted.`,
      targetRoles: ["super_admin", "inventory_manager"],
    });
    return response.data;
  },

  // POST /api/v1/inventory/requisitions (RequisitionOrderCreate)
  createPurchaseOrder: async (data: Record<string, unknown>) => {
    let itemId = data.item_id;
    if (!itemId && typeof data.item === "string" && UUID_RE.test(data.item)) {
      itemId = data.item;
    }
    if (!itemId) {
      throw new Error("A valid inventory item (item_id) is required to issue a purchase order.");
    }
    const quantity = Number(data.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("A quantity greater than zero is required.");
    }

    const response = await api.post("/inventory/requisitions", { item_id: itemId, quantity });
    await publishActionEvent({
      module: "inventory",
      action: "create",
      title: "Requisition Issued",
      message: `Requisition order generated for item ${itemId} (qty ${quantity}).`,
      targetRoles: ["super_admin", "inventory_manager", "finance_user"],
    });
    return response.data;
  },

  // GET /api/v1/inventory/requisitions
  getRequisitions: async (params?: Record<string, unknown>) => {
    const response = await api.get("/inventory/requisitions", { params });
    return response.data;
  },

  // PUT /api/v1/inventory/requisitions/{req_id}/status (RequisitionStatusUpdate)
  updateRequisitionStatus: async (requisitionId: string, status: "pending" | "approved" | "rejected" | "received") => {
    const response = await api.put(`/inventory/requisitions/${requisitionId}/status`, { status });
    await publishActionEvent({
      module: "inventory",
      action: "update",
      title: `Requisition Order ${status.toUpperCase()}`,
      message: `Purchase/Requisition order ${requisitionId} status updated to ${status}.`,
      targetRoles: ["super_admin", "inventory_manager", "finance_user"],
    });
    return response.data;
  },

  // POST /api/v1/inventory/requisitions/bulk/status
  bulkUpdateRequisitions: async (requisitionIds: string[], status: string) => {
    const response = await api.post("/inventory/requisitions/bulk/status", {
      requisition_ids: requisitionIds,
      status,
    });
    return response.data;
  },

  // GET /api/v1/admin/dashboard/inventory-alerts
  getInventoryAlerts: async () => {
    const response = await api.get("/admin/dashboard/inventory-alerts");
    return response.data?.data ?? response.data;
  },
};

export default inventoryService;
