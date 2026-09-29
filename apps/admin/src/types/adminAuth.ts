export interface AdminUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  isStaff: boolean;
  isSuperuser: boolean;
  mustChangePassword: boolean;
}

export interface AdminTokens {
  access: string;
  refresh: string;
}

export interface AdminLoginResponse {
  access: string;
  refresh: string;
  user: AdminUser;
}
