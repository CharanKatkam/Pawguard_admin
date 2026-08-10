import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export type DonationType = "one_time" | "recurring" | "sponsorship";
export type DonationStatus = "pending" | "success" | "failed";

export interface DonationPayload {
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

/** Normalize a raw DonationResponse row to the page shape. */
export const normalizeDonationRow = (d: any): any => ({
  id: d.id,
  donorId: d.donor_id,
  donorName: d.donor_name,
  dogId: d.dog_id,
  campaignId: d.campaign_id,
  amount: d.amount,
  currency: d.currency,
  type: d.donation_type,
  status: d.status,
  transactionId: d.transaction_id,
  notes: d.notes,
  paymentProvider: d.payment_provider,
  date: d.created_at,
});

export const donationsService = {
  // GET /donations - list all donations (paginated, filterable)
  getDonations: async (params?: DonationFilters) => {
    const response = await api.get("/donations", { params });
    const body = response.data;
    const raw = Array.isArray(body) ? body : body?.data;
    const rows = Array.isArray(raw) ? raw.map(normalizeDonationRow) : [];
    return { ...body, data: rows, total: body?.meta?.total ?? rows.length };
  },

  // GET /donations/history - full donation history list
  getDonationHistory: async () => {
    const response = await api.get("/donations/history");
    const body = response.data;
    const raw = Array.isArray(body) ? body : body?.data;
    return Array.isArray(raw) ? raw.map(normalizeDonationRow) : [];
  },

  // POST /donations - record a manual donation (DonationCreate)
  createDonation: async (payload: DonationPayload) => {
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

  // PATCH /donations/{donation_id}/status - update donation status
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

  // GET /donations/{donation_id}/receipt - resolve receipt download URL
  getDonationReceipt: async (donationId: string) => {
    const response = await api.get(`/donations/${donationId}/receipt`);
    const data = response.data?.data ?? response.data;
    return data;
  },

  // GET /donations/donors - list donor profiles (paginated)
  getDonors: async (params?: { search?: string; page?: number; page_size?: number; sort_by?: string; sort_order?: string }) => {
    const response = await api.get("/donations/donors", { params });
    const body = response.data;
    const raw = Array.isArray(body) ? body : body?.data;
    return { ...body, data: Array.isArray(raw) ? raw : [], total: body?.meta?.total ?? (Array.isArray(raw) ? raw.length : 0) };
  },

  // GET /donations/campaigns - list public campaigns (for donation attribution)
  getCampaigns: async () => {
    const response = await api.get("/donations/campaigns");
    const body = response.data;
    const raw = Array.isArray(body) ? body : body?.data ?? body?.campaigns;
    return Array.isArray(raw) ? raw : [];
  },

  // GET /donations/sponsorships - list all sponsorships (paginated)
  getSponsorships: async (params?: { page?: number; page_size?: number; sort_by?: string; sort_order?: string }) => {
    const response = await api.get("/donations/sponsorships", { params });
    const body = response.data;
    const raw = Array.isArray(body) ? body : body?.data;
    return { ...body, data: Array.isArray(raw) ? raw : [], total: body?.meta?.total ?? (Array.isArray(raw) ? raw.length : 0) };
  },

  // GET /donations/recurring - list recurring subscription records (paginated)
  getRecurringDonations: async (params?: { page?: number; page_size?: number }) => {
    const response = await api.get("/donations/recurring", { params });
    const body = response.data;
    const raw = Array.isArray(body) ? body : body?.data;
    return { ...body, data: Array.isArray(raw) ? raw : [], total: body?.meta?.total ?? (Array.isArray(raw) ? raw.length : 0) };
  },
};

export default donationsService;
