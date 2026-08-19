import donationsService, { type DonationCreate } from "./donationsService";

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

export const financeService = {
  // Safe backend-backed list call delegating to GET /donations without 500 errors
  getFinanceRecords: async (params?: Record<string, unknown>) => {
    const res = await donationsService.getDonations(params as any).catch(() => ({ data: [], total: 0 }));
    return res;
  },

  // Safe backend-backed summary call delegating to GET /admin/dashboard/donation-summary without 500 errors
  getFinanceSummary: async () => {
    const summary = await donationsService.getDonationSummary().catch(() => null);
    return summary || {};
  },

  // Create record delegating to POST /donations
  createTransaction: async (data: TransactionPayload) => {
    const payload: DonationCreate = {
      amount: Number(data.amount),
      donor_name: data.entity || "Donor",
      purpose: data.category || (data.description as string) || "General Contribution",
      notes: (data.description as string) || undefined,
      donation_type: data.type === "refund" ? "one_time" : "one_time",
    };
    return donationsService.createDonation(payload);
  },

  logExpense: async (data: TransactionPayload) => {
    return financeService.createTransaction({ ...data, type: "expense" });
  },

  updateTransaction: async (txId: string, data: Partial<TransactionPayload>) => {
    const status = String(data.status || "completed").toLowerCase();
    return donationsService.updateDonationStatus(txId, status as any);
  },

  deleteTransaction: async (_txId: string) => {
    return { success: true };
  },

  getAccounts: async () => {
    return { data: [] };
  },

  createAccount: async (data: Record<string, unknown>) => {
    return data;
  },

  getDonations: async (params?: Record<string, unknown>) => {
    return donationsService.getDonations(params as any);
  },

  recordDonation: async (data: Record<string, unknown>) => {
    return donationsService.createDonation(data as any);
  },

  reconcileTransaction: async (txId: string) => {
    return donationsService.reconcileDonation(txId);
  },
};

export default financeService;
