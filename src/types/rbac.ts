export interface RoleRecord {
  id: string;
  name: string;
  description?: string;
  category?: string;
  permissions?: string[];
  userCount?: number;
  isSystem?: boolean;
  is_active?: boolean;
  status?: string;
}

export interface RoleAssignment {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  is_active?: boolean;
  status?: string;
}
