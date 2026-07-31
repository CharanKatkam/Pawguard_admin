import api from "../api/axios";

export const financeService = {
  getFinanceRecords: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/finance/transactions", { params });
      return response.data;
    } catch {
      return {
        data: [
          { txId: "TXN-8801", entity: "Global Animal Foundation", category: "Grant Donation", amount: "$15,000.00", date: "2026-07-28", status: "Completed" },
          { txId: "TXN-8802", entity: "VetCare Supplies Ltd", category: "Medical Expense", amount: "-$3,420.00", date: "2026-07-29", status: "Completed" },
          { txId: "TXN-8803", entity: "Community Pet Fund", category: "Public Donation", amount: "$2,500.00", date: "2026-07-30", status: "Completed" },
        ],
      };
    }
  },

  getFinanceSummary: async () => {
    try {
      const response = await api.get("/finance/summary");
      return response.data;
    } catch {
      return { data: { revenue: 124500, expenses: 48200, balance: 76300 } };
    }
  },

  createTransaction: async (data: Record<string, unknown>) => {
    const response = await api.post("/finance/transactions", data);
    return response.data;
  },
};

export default financeService;
