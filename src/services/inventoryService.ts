import api from "../api/axios";

export const inventoryService = {
  getInventory: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/inventory/items", { params });
      return response.data;
    } catch {
      return {
        data: [
          { sku: "INV-MED-01", itemName: "Amoxicillin 500mg", category: "Medicines", stock: "450 Vials", threshold: "100 Vials", status: "In Stock", supplier: "PharmaVet" },
          { sku: "INV-FOOD-02", itemName: "Puppy High-Protein Kibble", category: "Food & Nutrition", stock: "12 Bags", threshold: "25 Bags", status: "Low Stock", supplier: "NutriPaw Supplies" },
          { sku: "INV-MED-03", itemName: "Rabies Core Vaccine Dose", category: "Vaccines", stock: "80 Doses", threshold: "50 Doses", status: "In Stock", supplier: "Global BioVet" },
        ],
      };
    }
  },

  createInventoryItem: async (data: Record<string, unknown>) => {
    const response = await api.post("/inventory/items", data);
    return response.data;
  },

  deleteInventoryItem: async (itemId: string) => {
    const response = await api.delete(`/inventory/items/${itemId}`);
    return response.data;
  },
};

export default inventoryService;
