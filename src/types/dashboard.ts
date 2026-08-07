export type AnyRecord = Record<string, unknown>;

export interface ShelterOccupancy {
  capacity?: number;
  occupied?: number;
  occupancy_pct?: number;
}

export interface DashboardSummary {
  total_users?: number;
  users_count?: number;
  total_dogs?: number;
  dogs_count?: number;
  total_shelters?: number;
  shelters_count?: number;
  rescue_centres_count?: number;
  adoptable_dogs?: number;
  pending_adoptions?: number;
  adoptions_count?: number;
  active_rescues?: number;
  rescue_requests?: number;
  active_foster_placements?: number;
  foster_placements?: number;
  medical_cases?: number;
  medical_records_count?: number;
  volunteers?: number;
  volunteers_count?: number;
  donations_count?: number;
  total_donations?: number;
  donations_total?: number;
  inventory_alerts?: number;
  low_stock_count?: number;
  active_sessions?: number;
  verified_users?: number;
  open_grievances?: number;
  unread_notifications?: number;
  shelter_occupancy?: ShelterOccupancy;
  [key: string]: unknown;
}

export interface ActivityEntry {
  id: string | number;
  user: string;
  action: string;
  module: string;
  time: string;
  status: string;
  raw?: AnyRecord;
}

export interface NotificationEntry {
  id: string | number;
  title: string;
  message: string;
  type: string;
  time: string;
  read: boolean;
  category?: string;
}

export interface AlertItem {
  id: string;
  severity: "danger" | "warning" | "info" | "success";
  title: string;
  description: string;
  module: string;
  path: string;
  count?: number;
}
