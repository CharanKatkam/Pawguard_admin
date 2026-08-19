import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export type DonationType = "one_time" | "recurring" | "sponsorship";
export type DonationStatus = "pending" | "completed" | "failed" | "refunded" | "cancelled";

export interface DonationCreate {
  amount: number;
  currency?: string;
  donation_type?: DonationType;
  notes?: string;
  dog_id?: string;
  campaign_id?: string;
  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;
  payment_method?: string;
  transaction_id?: string;
  purpose?: string;
}

export interface DonationStatusUpdate {
  status: DonationStatus;
}

export interface DonationReconcileRequest {
  reconciliation_notes?: string;
  notes?: string;
}

export interface SponsorshipCreate {
  dog_id: string;
  amount: number;
  currency?: string;
  sponsor_name?: string;
  sponsor_email?: string;
  sponsor_phone?: string;
  payment_method?: string;
  duration_months?: number;
  notes?: string;
}

export interface DonationFilters {
  search?: string;
  donation_type?: DonationType;
  status?: DonationStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}

/** Robust array extractor across varied API response wrapper formats */
export const extractArray = (body: any): any[] => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.donations)) return body.donations;
  if (Array.isArray(body?.sponsorships)) return body.sponsorships;
  if (Array.isArray(body?.donors)) return body.donors;
  if (Array.isArray(body?.results)) return body.results;
  return [];
};

/** Robust status helper for valid completed revenue contributions */
export const isCompletedDonationStatus = (statusRaw: unknown): boolean => {
  const s = String(statusRaw ?? "").toLowerCase().trim();
  if (!s) return true; // Default donations are valid
  if (["failed", "refunded", "cancelled", "declined"].includes(s)) return false;
  return true; // Matches "completed", "success", "posted", "paid", "approved", "successful", "active"
};

/** Robust status helper for refunded entries */
export const isRefundedDonationStatus = (statusRaw: unknown): boolean => {
  const s = String(statusRaw ?? "").toLowerCase().trim();
  return ["refunded", "refund", "returned"].includes(s);
};

/** Robust status helper for valid active/completed sponsorships */
export const isValidSponsorshipStatus = (statusRaw: unknown): boolean => {
  const s = String(statusRaw ?? "").toLowerCase().trim();
  if (!s) return true;
  if (["cancelled", "failed", "refunded", "declined"].includes(s)) return false;
  return true;
};

/** Normalize raw DonationResponse row to standard page format. */
export const normalizeDonationRow = (d: any): any => ({
  id: d.id || d._id || d.donation_id,
  donorId: d.donor_id || d.user_id,
  donorName: d.donor_name || d.user?.full_name || d.user_name || d.name || "Anonymous Donor",
  donorEmail: d.donor_email || d.user?.email || d.email,
  donorPhone: d.donor_phone || d.phone,
  dogId: d.dog_id,
  campaignId: d.campaign_id,
  amount: Number(d.amount || d.total_amount || d.price || d.donation_amount || 0),
  currency: d.currency || "INR",
  type: d.donation_type || d.type || "one_time",
  status: d.status || "completed",
  transactionId: d.transaction_id || d.payment_id || d.tx_id,
  notes: d.notes || d.purpose || d.description,
  paymentProvider: d.payment_provider || d.payment_method,
  date: d.created_at || d.transaction_date || d.date || d.updated_at,
});

export const donationsService = {
  // GET /api/v1/admin/dashboard/donation-summary
  getDonationSummary: async () => {
    const response = await api.get("/admin/dashboard/donation-summary");
    return response.data?.data ?? response.data;
  },

  // GET /api/v1/donations
  getDonations: async (params?: DonationFilters) => {
    const response = await api.get("/donations", { params });
    const body = response.data;
    const raw = extractArray(body);
    const rows = raw.map(normalizeDonationRow);
    return { ...body, data: rows, total: body?.meta?.total ?? body?.total ?? rows.length };
  },

  // GET /api/v1/donations/history
  getDonationHistory: async () => {
    const response = await api.get("/donations/history");
    const body = response.data;
    const raw = extractArray(body);
    return raw.map(normalizeDonationRow);
  },

  // POST /api/v1/donations (DonationCreate)
  createDonation: async (payload: DonationCreate) => {
    const response = await api.post("/donations", {
      amount: Number(payload.amount),
      currency: payload.currency || "INR",
      donation_type: payload.donation_type || "one_time",
      notes: payload.notes || null,
      dog_id: payload.dog_id || null,
      campaign_id: payload.campaign_id || null,
      donor_name: payload.donor_name || null,
      donor_email: payload.donor_email || null,
      donor_phone: payload.donor_phone || null,
      payment_method: payload.payment_method || null,
      transaction_id: payload.transaction_id || null,
      purpose: payload.purpose || null,
    });
    await publishActionEvent({
      module: "finance",
      action: "create",
      title: "Donation Recorded",
      message: `Donation of ₹${Number(payload.amount).toFixed(2)} logged.`,
      targetRoles: ["super_admin", "finance_user"],
    });
    return response.data?.data ?? response.data;
  },

  // PATCH /api/v1/donations/{donation_id}/status (DonationStatusUpdate)
  updateDonationStatus: async (donationId: string, status: DonationStatus) => {
    const response = await api.patch(`/donations/${donationId}/status`, { status });
    await publishActionEvent({
      module: "finance",
      action: "update",
      title: "Donation Status Updated",
      message: `Donation ${donationId} marked as ${status}.`,
      targetRoles: ["super_admin", "finance_user"],
    });
    return response.data?.data ?? response.data;
  },

  // POST /api/v1/donations/{donation_id}/reconcile (DonationReconcileRequest)
  reconcileDonation: async (donationId: string, reconciliation_notes?: string) => {
    const notesText = reconciliation_notes || "Reconciled by Finance User";
    const response = await api.post(`/donations/${donationId}/reconcile`, {
      reconciliation_notes: notesText,
      notes: notesText,
    });
    await publishActionEvent({
      module: "finance",
      action: "update",
      title: "Donation Reconciled",
      message: `Donation ${donationId} marked as reconciled.`,
      targetRoles: ["super_admin", "finance_user"],
    });
    return response.data?.data ?? response.data;
  },

  // POST /api/v1/donations/bulk/status-update
  bulkUpdateDonationStatus: async (donationIds: string[], status: DonationStatus) => {
    const response = await api.post("/donations/bulk/status-update", { donation_ids: donationIds, status });
    return response.data?.data ?? response.data;
  },

  // GET /api/v1/donations/{donation_id}/receipt
  getDonationReceipt: async (donationId: string) => {
    const response = await api.get(`/donations/${donationId}/receipt`);
    return response.data ?? response;
  },

  // GET /api/v1/donations/donors
  getDonors: async (params?: { search?: string; page?: number; page_size?: number }) => {
    const response = await api.get("/donations/donors", { params });
    const body = response.data;
    const raw = extractArray(body);
    return { ...body, data: raw, total: body?.meta?.total ?? body?.total ?? raw.length };
  },

  // GET /api/v1/donations/sponsorships
  getSponsorships: async (params?: { page?: number; page_size?: number }) => {
    const response = await api.get("/donations/sponsorships", { params });
    const body = response.data;
    const raw = extractArray(body);
    return { ...body, data: raw, total: body?.meta?.total ?? body?.total ?? raw.length };
  },

  // POST /api/v1/donations/sponsorships
  createSponsorship: async (payload: SponsorshipCreate) => {
    const response = await api.post("/donations/sponsorships", {
      dog_id: payload.dog_id,
      amount: Number(payload.amount),
      currency: payload.currency || "INR",
      sponsor_name: payload.sponsor_name || null,
      sponsor_email: payload.sponsor_email || null,
      sponsor_phone: payload.sponsor_phone || null,
      payment_method: payload.payment_method || null,
      duration_months: payload.duration_months || 12,
      notes: payload.notes || null,
    });
    await publishActionEvent({
      module: "finance",
      action: "create",
      title: "Dog Sponsorship Registered",
      message: `Dog sponsorship of ₹${payload.amount} registered.`,
      targetRoles: ["super_admin", "finance_user"],
    });
    return response.data?.data ?? response.data;
  },

  // PATCH /api/v1/donations/sponsorships/{sponsorship_id}/status
  updateSponsorshipStatus: async (sponsorshipId: string, status: string) => {
    const response = await api.patch(`/donations/sponsorships/${sponsorshipId}/status`, { status });
    await publishActionEvent({
      module: "finance",
      action: "update",
      title: "Sponsorship Status Updated",
      message: `Sponsorship ${sponsorshipId} status set to ${status}.`,
      targetRoles: ["super_admin", "finance_user"],
    });
    return response.data?.data ?? response.data;
  },

  // GET /api/v1/donations/sponsorships/{sponsorship_id}
  getSponsorshipById: async (sponsorshipId: string) => {
    const response = await api.get(`/donations/sponsorships/${sponsorshipId}`);
    return response.data?.data ?? response.data;
  },

  // POST /api/v1/finance/reconcile/donations
  reconcileFinanceDonations: async (payload?: Record<string, unknown>) => {
    const response = await api.post("/finance/reconcile/donations", payload || {});
    return response.data?.data ?? response.data;
  },
};

export default donationsService;
