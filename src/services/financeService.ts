import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface TransactionPayload {
  txId?: string;
  entity: string;
  category: string;
  amount: string | number;
  date?: string;
  status?: string;
  type?: "donation" | "expense";
}

export const financeService = {
  getFinanceRecords: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/finance/transactions", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  getFinanceSummary: async () => {
    try {
      const response = await api.get("/finance/summary");
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { revenue: 0, expenses: 0 };
      throw err;
    }
  },

  createTransaction: async (data: TransactionPayload) => {
    const response = await api.post("/finance/transactions", data);
    await publishActionEvent({
      module: "finance",
      action: "create",
      title: "Financial Transaction Recorded",
      message: `Transaction ${data.category || "General"} of $${data.amount} logged for ${data.entity}.`,
      targetRoles: ["super_admin", "finance_user"],
    });
    return response.data;
  },

  logExpense: async (data: TransactionPayload) => {
    const response = await api.post("/finance/expenses", data);
    await publishActionEvent({
      module: "finance",
      action: "create",
      title: "Operational Expense Logged",
      message: `Expense of $${data.amount} logged under ${data.category}.`,
      targetRoles: ["super_admin", "finance_user"],
    });
    return response.data;
  },

  updateTransaction: async (txId: string, data: Partial<TransactionPayload>) => {
    const response = await api.put(`/finance/transactions/${txId}`, data);
    await publishActionEvent({
      module: "finance",
      action: "update",
      title: "Transaction Ledger Item Modified",
      message: `Transaction record ${txId} updated.`,
      targetRoles: ["super_admin", "finance_user"],
    });
    return response.data;
  },

  deleteTransaction: async (txId: string) => {
    const response = await api.delete(`/finance/transactions/${txId}`);
    await publishActionEvent({
      module: "finance",
      action: "delete",
      title: "Transaction Entry Removed",
      message: `Ledger item ${txId} deleted.`,
      targetRoles: ["super_admin", "finance_user"],
    });
    return response.data;
  },
};

export default financeService;
