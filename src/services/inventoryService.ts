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
    supplier: "",
    quantity,
    unit: item.unit,
    reorder_threshold: threshold,
    expiry_date: item.expiry_date,
    unit_cost: item.unit_cost,
  };
};

export const inventoryService = {
  getInventory: async (params?: Record<string, unknown>) => {
    const response = await api.get("/inventory/items", { params });
    const body = response.data;
    const raw = Array.isArray(body) ? body : body?.data;
    const rows = Array.isArray(raw) ? raw.map(normalizeInventoryRow) : [];
    return { ...body, data: rows, total: body?.meta?.total ?? rows.length };
  },

  // POST /inventory/items - InventoryItemCreate
  createInventoryItem: async (data: Record<string, unknown>) => {
    const { quantity, unit } = parseStock(data.stock as string | number | undefined);
    const payload: Record<string, unknown> = {
      name: String(data.itemName || data.name || ""),
      category: toItemCategory(String(data.category || "consumable")),
      unit,
    };
    if (quantity > 0) payload.quantity = quantity;
    if (data.threshold !== undefined && data.threshold !== null && data.threshold !== "") {
      const t = parseStock(data.threshold as string | number | undefined);
      payload.reorder_threshold = t.quantity;
    }
    if (data.expiry_date) payload.expiry_date = data.expiry_date;
    if (data.unit_cost !== undefined && data.unit_cost !== null) payload.unit_cost = Number(data.unit_cost);

    const response = await api.post("/inventory/items", payload);
    await publishActionEvent({
      module: "inventory",
      action: "create",
      title: "New Inventory Item Added",
      message: `Item ${payload.name} added to stock inventory under ${payload.category}.`,
      targetRoles: ["super_admin", "inventory_manager", "shelter_manager", "rescue_centre_admin"],
    });
    return response.data;
  },

  // POST /inventory/movements - InventoryMovementCreate
  // The backend has no PUT endpoint for inventory items; stock corrections
  // are recorded as inventory movements.
  updateInventoryItem: async (itemId: string, data: Record<string, unknown>) => {
    if (data.quantity === undefined && data.stock === undefined) {
      throw new Error(
        "Inventory item metadata cannot be updated on the backend. Provide a stock quantity to adjust."
      );
    }
    const rawQty = data.quantity ?? data.stock;
    const parsed =
      typeof rawQty === "number" || /^[\d.]+$/.test(String(rawQty ?? ""))
        ? { quantity: Number(rawQty), unit: "" }
        : parseStock(rawQty as string);
    const quantity = parsed.quantity;
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error("A valid non-negative stock quantity is required.");
    }

    const response = await api.post("/inventory/movements", {
      item_id: itemId,
      movement_type: "adjustment",
      quantity,
      notes: data.notes || "Manual stock adjustment",
    });
    await publishActionEvent({
      module: "inventory",
      action: "update",
      title: "Inventory Stock Levels Updated",
      message: `Stock level adjusted to ${quantity} for item ${itemId}.`,
      targetRoles: ["super_admin", "inventory_manager", "shelter_manager"],
    });
    return response.data;
  },

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

  // POST /inventory/requisitions - RequisitionOrderCreate { item_id (uuid), quantity }
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

  // GET /inventory/requisitions - PaginatedRequisitionOrderResponse
  getRequisitions: async (params?: Record<string, unknown>) => {
    const response = await api.get("/inventory/requisitions", { params });
    return response.data;
  },

  // PATCH /inventory/requisitions/{requisition_id}/status - RequisitionStatusUpdate
  updateRequisitionStatus: async (requisitionId: string, status: "pending" | "approved" | "rejected" | "received") => {
    const response = await api.patch(`/inventory/requisitions/${requisitionId}/status`, { status });
    await publishActionEvent({
      module: "inventory",
      action: "update",
      title: `Requisition Order ${status.toUpperCase()}`,
      message: `Purchase/Requisition order ${requisitionId} status updated to ${status}.`,
      targetRoles: ["super_admin", "inventory_manager", "finance_user"],
    });
    return response.data;
  },

  // GET /inventory/movements - PaginatedInventoryMovementResponse
  getMovements: async (params?: Record<string, unknown>) => {
    const response = await api.get("/inventory/movements", { params });
    return response.data;
  },
};

export default inventoryService;
