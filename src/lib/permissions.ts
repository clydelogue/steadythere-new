import type { OrgRole } from '@/types/database';

// Role hierarchy and permissions
export const ROLE_CONFIG: Record<OrgRole, {
  label: string;
  description: string;
  color: string;
  icon: 'building' | 'shield' | 'user';
  sortOrder: number;
}> = {
  owner: {
    label: 'Owner',
    description: 'Full administrative access. Can manage all aspects of the organization.',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    icon: 'building',
    sortOrder: 1,
  },
  admin: {
    label: 'Admin',
    description: 'Can manage events, templates, and team members.',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: 'shield',
    sortOrder: 2,
  },
  member: {
    label: 'Member',
    description: 'Can view and participate in events and milestones.',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: 'user',
    sortOrder: 3,
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
  owner: [
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
  admin: [
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
  member: [
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
  return role === 'owner' || role === 'admin';
}

/**
 * Get roles that a user with the given role can assign to others
 */
export function getAssignableRoles(role: OrgRole): OrgRole[] {
  if (role === 'owner') {
    return ['admin', 'member'];
  }
  if (role === 'admin') {
    return ['member'];
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
