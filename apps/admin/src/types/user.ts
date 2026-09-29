export interface AdminAddress {
  id: string;
  title: string;
  province: string;
  city: string;
  line: string;
  postalCode: string;
  receiverName: string;
  receiverPhone: string;
  isDefault: boolean;
}

export interface AdminUserListItem {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  email: string | null;
  isVerified: boolean;
  isActive: boolean;
  isStaff: boolean;
  role: string | null;
  roleName: string | null;
  createdAt: string;
}

export interface AdminUser extends AdminUserListItem {
  addresses: AdminAddress[];
  orderCount: number;
}

export interface CreateUserFormValues {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  isVerified: boolean;
  isStaff: boolean;
  roleId: string | null;
}

export interface UpdateUserFormValues {
  firstName: string;
  lastName: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  isStaff: boolean;
  roleId: string | null;
}
