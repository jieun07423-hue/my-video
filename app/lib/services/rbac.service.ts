import { apiLogger } from '@/lib/logger';

export type UserRole = 'owner' | 'manager' | 'kitchen' | 'staff';

const rolePermissions: Record<UserRole, string[]> = {
  owner: ['manage_store', 'view_sales', 'manage_staff', 'manage_menu', 'manage_orders', 'manage_settings'],
  manager: ['view_sales', 'manage_menu', 'manage_orders', 'manage_staff'],
  kitchen: ['view_orders', 'update_order_status'],
  staff: ['view_orders', 'create_order'],
};

export class RBACService {
  hasPermission(role: UserRole, permission: string): boolean {
    const permissions = rolePermissions[role] || [];
    return permissions.includes(permission) || role === 'owner';
  }

  getPermissionsForRole(role: UserRole): string[] {
    return rolePermissions[role] || [];
  }
}

export const rbacService = new RBACService();
