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

export const inventoryService = {
  getInventory: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/inventory/items", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  createInventoryItem: async (data: Record<string, unknown>) => {
    const response = await api.post("/inventory/items", data);
    await publishActionEvent({
      module: "inventory",
      action: "create",
      title: "New Inventory Item Added",
      message: `Item ${data.itemName || "Supply"} added to stock inventory under ${data.category || "General"}.`,
      targetRoles: ["super_admin", "inventory_manager", "shelter_manager", "rescue_centre_admin"],
    });
    return response.data;
  },

  updateInventoryItem: async (itemId: string, data: Record<string, unknown>) => {
    const response = await api.put(`/inventory/items/${itemId}`, data);
    await publishActionEvent({
      module: "inventory",
      action: "update",
      title: "Inventory Stock Levels Updated",
      message: `Stock level updated for item ${itemId}.`,
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

  createPurchaseOrder: async (data: Record<string, unknown>) => {
    const response = await api.post("/inventory/purchase-orders", data);
    await publishActionEvent({
      module: "inventory",
      action: "create",
      title: "Purchase Order Issued",
      message: `Purchase order generated for inventory re-stocking.`,
      targetRoles: ["super_admin", "inventory_manager", "finance_user"],
    });
    return response.data;
  },

  getLowStockItems: async () => {
    const response = await api.get("/inventory/low-stock");
    return response.data;
  },
};

export default inventoryService;
