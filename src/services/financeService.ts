import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface TransactionPayload {
  txId?: string;
  entity: string;
  category: string;
  amount: string | number;
  date?: string;
  status?: string;
  type?: "donation" | "expense" | "income" | "transfer" | "refund";
  [key: string]: unknown;
}

/** Map a friendly status label to the TransactionStatus enum. */
const toTransactionStatus = (status?: string): string => {
  const s = String(status || "").toLowerCase().trim();
  const map: Record<string, string> = {
    completed: "posted",
    posted: "posted",
    reconciled: "reconciled",
    pending: "pending",
    voided: "voided",
    cancelled: "voided",
  };
  return map[s] || "posted";
};

/** Map a friendly type label to the TransactionType enum. */
const toTransactionType = (type?: string): string => {
  const s = String(type || "").toLowerCase().trim();
  if (s.includes("donation") || s.includes("income") || s.includes("revenue")) return "income";
  if (s.includes("expense")) return "expense";
  if (s.includes("transfer")) return "transfer";
  if (s.includes("refund")) return "refund";
  if (s.includes("reconcil")) return "reconciliation";
  return "income";
};

/** Normalize a raw FinancialTransactionResponse row to the page shape. */
export const normalizeTransactionRow = (tx: any): any => ({
  txId: tx.id,
  id: tx.id,
  transactionNumber: tx.transaction_number,
  entity: tx.description || tx.reference_type || tx.donor_name || "—",
  category: tx.reference_type || "General",
  amount: tx.amount,
  date: tx.transaction_date || tx.created_at,
  status: tx.status || "posted",
  type: tx.transaction_type || "income",
  currency: tx.currency,
});

export const financeService = {
  getFinanceRecords: async (params?: Record<string, unknown>) => {
    const response = await api.get("/finance/transactions", { params });
    const body = response.data;
    const raw = Array.isArray(body) ? body : body?.data;
    const rows = Array.isArray(raw) ? raw.map(normalizeTransactionRow) : [];
    return { ...body, data: rows, total: body?.meta?.total ?? rows.length };
  },

  getFinanceSummary: async () => {
    const response = await api.get("/finance/summary");
    return response.data;
  },

  // POST /finance/transactions - FinancialTransactionCreate
  createTransaction: async (data: TransactionPayload) => {
    const payload: Record<string, unknown> = {
      transaction_type:
        data.transaction_type || toTransactionType(String(data.type || "donation")),
      amount: Number(data.amount),
      currency: data.currency || "USD",
    };
    if (data.description || data.entity || data.category) {
      payload.description = String(data.description || `${data.entity || ""}${data.category ? ` - ${data.category}` : ""}`).trim();
    }
    if (data.date || data.transaction_date) {
      payload.transaction_date = String(data.date || data.transaction_date);
    }
    if (data.reference_type) payload.reference_type = data.reference_type;
    if (data.reference_id) payload.reference_id = data.reference_id;

    const response = await api.post("/finance/transactions", payload);
    await publishActionEvent({
      module: "finance",
      action: "create",
      title: "Financial Transaction Recorded",
      message: `Transaction ${String(payload.description || "General")} of $${data.amount} logged.`,
      targetRoles: ["super_admin", "finance_user"],
    });
    return response.data;
  },

  logExpense: async (data: TransactionPayload) => {
    const response = await financeService.createTransaction({ ...data, type: "expense" });
    return response.data;
  },

  // PATCH /finance/transactions/{tx_id}/status
  // The backend has no full transaction update endpoint - only status transitions.
  updateTransaction: async (txId: string, data: Partial<TransactionPayload>) => {
    const response = await api.patch(`/finance/transactions/${txId}/status`, {
      status: toTransactionStatus(data.status || "posted"),
    });
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
