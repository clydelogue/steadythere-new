import type { OrgRole } from '@/types/database';

// Role hierarchy and permissions for the 5-role system
export const ROLE_CONFIG: Record<OrgRole, {
  label: string;
  description: string;
  color: string;
  icon: 'building' | 'shield' | 'calendar' | 'store' | 'handshake' | 'heart';
  sortOrder: number;
}> = {
  org_admin: {
    label: 'Admin',
    description: 'Full administrative access. Can manage all aspects of the organization.',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    icon: 'building',
    sortOrder: 1,
  },
  event_manager: {
    label: 'Event Manager',
    description: 'Can create and manage all events and their milestones.',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: 'calendar',
    sortOrder: 2,
  },
  vendor: {
    label: 'Vendor',
    description: 'External vendor with limited access to view and update their assigned activities.',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    icon: 'store',
    sortOrder: 3,
  },
  partner: {
    label: 'Partner',
    description: 'Partner organization with access to view and collaborate on shared activities.',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    icon: 'handshake',
    sortOrder: 4,
  },
  volunteer: {
    label: 'Volunteer',
    description: 'Volunteer with access to view and update their assigned activities.',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
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

// Role-to-permission mapping for 5-role system
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
 * Check if a role can invite team members
 */
export function canInviteTeam(role: OrgRole | null | undefined): boolean {
  return hasPermission(role, 'team:invite');
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
 * Check if a role is an admin-level role (org_admin or event_manager)
 */
export function isAdminRole(role: OrgRole | null | undefined): boolean {
  return role === 'org_admin' || role === 'event_manager';
}

/**
 * Get roles that a user with the given role can assign to others
 */
export function getAssignableRoles(role: OrgRole): OrgRole[] {
  if (role === 'org_admin') {
    return ['event_manager', 'vendor', 'partner', 'volunteer'];
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
