import type { OrgRole } from '@/types/database';

// Role hierarchy and permissions
export const ROLE_CONFIG: Record<OrgRole, {
  label: string;
  description: string;
  color: string;
  icon: 'building' | 'calendar' | 'store' | 'handshake' | 'heart';
  sortOrder: number;
}> = {
  org_admin: {
    label: 'Org Admin',
    description: 'Full administrative access. Can create, edit, and archive the organization.',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    icon: 'building',
    sortOrder: 1,
  },
  event_manager: {
    label: 'Event Manager',
    description: 'Can create new events and manage all event-related activities.',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: 'calendar',
    sortOrder: 2,
  },
  vendor: {
    label: 'Vendor',
    description: 'Can view activities, report on actions, and edit their assigned activities.',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    icon: 'store',
    sortOrder: 3,
  },
  partner: {
    label: 'Partner',
    description: 'Can view activities, report on actions, and edit their assigned activities.',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: 'handshake',
    sortOrder: 4,
  },
  volunteer: {
    label: 'Volunteer',
    description: 'Can view activities, report on actions, and edit their assigned activities.',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    icon: 'heart',
    sortOrder: 5,
  },
};

// Permission types
export type Permission =
  | 'org:create'
  | 'org:edit'
  | 'org:archive'
  | 'org:view'
  | 'org:manage_members'
  | 'event:create'
  | 'event:edit'
  | 'event:delete'
  | 'event:view'
  | 'event:manage_milestones'
  | 'milestone:create'
  | 'milestone:edit'
  | 'milestone:delete'
  | 'milestone:view'
  | 'milestone:edit_own'
  | 'milestone:report'
  | 'template:create'
  | 'template:edit'
  | 'template:delete'
  | 'template:view'
  | 'team:view'
  | 'team:invite'
  | 'team:remove'
  | 'team:change_roles';

// Role-to-permission mapping
const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  org_admin: [
    'org:create',
    'org:edit',
    'org:archive',
    'org:view',
    'org:manage_members',
    'event:create',
    'event:edit',
    'event:delete',
    'event:view',
    'event:manage_milestones',
    'milestone:create',
    'milestone:edit',
    'milestone:delete',
    'milestone:view',
    'milestone:edit_own',
    'milestone:report',
    'template:create',
    'template:edit',
    'template:delete',
    'template:view',
    'team:view',
    'team:invite',
    'team:remove',
    'team:change_roles',
  ],
  event_manager: [
    'org:view',
    'event:create',
    'event:edit',
    'event:delete',
    'event:view',
    'event:manage_milestones',
    'milestone:create',
    'milestone:edit',
    'milestone:delete',
    'milestone:view',
    'milestone:edit_own',
    'milestone:report',
    'template:create',
    'template:edit',
    'template:delete',
    'template:view',
    'team:view',
    'team:invite',
  ],
  vendor: [
    'org:view',
    'event:view',
    'milestone:view',
    'milestone:edit_own',
    'milestone:report',
    'template:view',
    'team:view',
  ],
  partner: [
    'org:view',
    'event:view',
    'milestone:view',
    'milestone:edit_own',
    'milestone:report',
    'template:view',
    'team:view',
  ],
  volunteer: [
    'org:view',
    'event:view',
    'milestone:view',
    'milestone:edit_own',
    'milestone:report',
    'template:view',
    'team:view',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: OrgRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: OrgRole | null | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: OrgRole | null | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: OrgRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role can manage other roles (invite, remove, change roles)
 */
export function canManageTeam(role: OrgRole | null | undefined): boolean {
  return hasAnyPermission(role, ['team:invite', 'team:remove', 'team:change_roles']);
}

/**
 * Check if a role can manage organization settings
 */
export function canManageOrg(role: OrgRole | null | undefined): boolean {
  return hasAnyPermission(role, ['org:edit', 'org:archive']);
}

/**
 * Check if a role can manage events
 */
export function canManageEvents(role: OrgRole | null | undefined): boolean {
  return hasAnyPermission(role, ['event:create', 'event:edit', 'event:delete']);
}

/**
 * Check if a role is an admin-level role
 */
export function isAdminRole(role: OrgRole | null | undefined): boolean {
  return role === 'org_admin' || role === 'event_manager';
}

/**
 * Get roles that a user with the given role can assign to others
 */
export function getAssignableRoles(role: OrgRole): OrgRole[] {
  if (role === 'org_admin') {
    return ['org_admin', 'event_manager', 'vendor', 'partner', 'volunteer'];
  }
  if (role === 'event_manager') {
    return ['vendor', 'partner', 'volunteer'];
  }
  return [];
}

/**
 * Get all available roles sorted by hierarchy
 */
export function getAllRoles(): OrgRole[] {
  return Object.entries(ROLE_CONFIG)
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([role]) => role as OrgRole);
}
