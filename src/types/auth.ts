export type UserRole =
  | "super_admin"
  | "rescue_centre_admin"
  | "rescue_coordinator"
  | "rescue_agent"
  | "veterinarian"
  | "shelter_manager"
  | "adoption_coordinator"
  | "foster_coordinator"
  | "volunteer_coordinator"
  | "inventory_manager"
  | "finance_user";

export interface User {
  id?: string | number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string | UserRole | Record<string, unknown>;
  role_name?: string;
  user_type?: string;
  type?: string;
  avatar?: string;
  phone?: string;
  department?: string;
}

export interface MenuItem {
  name: string;
  path: string;
  iconName: string;
  badge?: string | number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time?: string;
  created_at?: string;
  type: "emergency" | "medical" | "adoption" | "system" | "volunteer" | "user_created" | "user_updated" | "user_deleted" | "shelter_added" | "animal_registered" | "animal_updated" | "adoption_submitted" | "adoption_approved" | "adoption_rejected" | "inventory_changed" | "medical_updated" | "certificate_generated" | "finance_action" | "role_permission_changed";
  read: boolean;
  user_id?: string;
  role_required?: string[];
  event_type?: string;
  data?: Record<string, unknown>;
}
