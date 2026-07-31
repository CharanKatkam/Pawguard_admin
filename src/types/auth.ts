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
  time: string;
  type: "emergency" | "medical" | "adoption" | "system" | "volunteer";
  read: boolean;
}
