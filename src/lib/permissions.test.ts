import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  canManageTeam,
  canInviteTeam,
  canManageOrg,
  canManageEvents,
  isAdminRole,
  getAssignableRoles,
  getAllRoles,
  ROLE_CONFIG,
  Permission,
} from './permissions';
import type { OrgRole } from '@/types/database';

describe('permissions', () => {
  describe('ROLE_CONFIG', () => {
    it('has configuration for all roles', () => {
      const allRoles: OrgRole[] = ['org_admin', 'event_manager', 'vendor', 'partner', 'volunteer'];
      allRoles.forEach(role => {
        expect(ROLE_CONFIG[role]).toBeDefined();
        expect(ROLE_CONFIG[role].label).toBeDefined();
        expect(ROLE_CONFIG[role].description).toBeDefined();
        expect(ROLE_CONFIG[role].color).toBeDefined();
        expect(ROLE_CONFIG[role].icon).toBeDefined();
        expect(ROLE_CONFIG[role].sortOrder).toBeDefined();
      });
    });

    it('org_admin has sortOrder 1 (highest priority)', () => {
      expect(ROLE_CONFIG.org_admin.sortOrder).toBe(1);
    });

    it('volunteer has sortOrder 5 (lowest priority)', () => {
      expect(ROLE_CONFIG.volunteer.sortOrder).toBe(5);
    });
  });

  describe('getPermissionsForRole', () => {
    it('org_admin has all permissions', () => {
      const permissions = getPermissionsForRole('org_admin');
      const allPermissions: Permission[] = [
        'org:create', 'org:edit', 'org:archive', 'org:view', 'org:manage_members',
        'event:create', 'event:edit', 'event:delete', 'event:view', 'event:manage_milestones',
        'milestone:create', 'milestone:edit', 'milestone:delete', 'milestone:view', 'milestone:edit_own', 'milestone:report',
        'template:create', 'template:edit', 'template:delete', 'template:view',
        'team:view', 'team:invite', 'team:remove', 'team:change_roles',
      ];
      allPermissions.forEach(perm => {
        expect(permissions).toContain(perm);
      });
    });

    it('event_manager has event permissions but not org management permissions', () => {
      const permissions = getPermissionsForRole('event_manager');
      // Should have event permissions
      expect(permissions).toContain('event:create');
      expect(permissions).toContain('event:edit');
      expect(permissions).toContain('event:delete');
      expect(permissions).toContain('event:view');
      expect(permissions).toContain('event:manage_milestones');
      // Should have template permissions
      expect(permissions).toContain('template:create');
      expect(permissions).toContain('template:edit');
      expect(permissions).toContain('template:delete');
      expect(permissions).toContain('template:view');
      // Should NOT have org management
      expect(permissions).not.toContain('org:create');
      expect(permissions).not.toContain('org:edit');
      expect(permissions).not.toContain('org:archive');
      expect(permissions).not.toContain('org:manage_members');
      // Should NOT have full team management
      expect(permissions).not.toContain('team:remove');
      expect(permissions).not.toContain('team:change_roles');
      // But should be able to invite
      expect(permissions).toContain('team:invite');
    });

    it('vendor has limited permissions', () => {
      const permissions = getPermissionsForRole('vendor');
      expect(permissions).toContain('org:view');
      expect(permissions).toContain('event:view');
      expect(permissions).toContain('milestone:view');
      expect(permissions).toContain('milestone:edit_own');
      expect(permissions).toContain('milestone:report');
      expect(permissions).toContain('template:view');
      expect(permissions).toContain('team:view');
      // Should NOT have create/edit/delete permissions
      expect(permissions).not.toContain('event:create');
      expect(permissions).not.toContain('event:edit');
      expect(permissions).not.toContain('milestone:create');
      expect(permissions).not.toContain('template:create');
    });

    it('partner has limited permissions', () => {
      const permissions = getPermissionsForRole('partner');
      expect(permissions).toContain('org:view');
      expect(permissions).toContain('event:view');
      expect(permissions).toContain('milestone:view');
      expect(permissions).toContain('milestone:edit_own');
      expect(permissions).toContain('milestone:report');
      expect(permissions).toContain('template:view');
      expect(permissions).toContain('team:view');
      // Should NOT have create/edit/delete permissions
      expect(permissions).not.toContain('event:create');
      expect(permissions).not.toContain('team:invite');
    });

    it('volunteer has minimal permissions', () => {
      const permissions = getPermissionsForRole('volunteer');
      expect(permissions).toContain('org:view');
      expect(permissions).toContain('event:view');
      expect(permissions).toContain('milestone:view');
      expect(permissions).toContain('milestone:edit_own');
      expect(permissions).toContain('milestone:report');
      expect(permissions).toContain('template:view');
      expect(permissions).toContain('team:view');
      // Should NOT have any management permissions
      expect(permissions).not.toContain('event:create');
      expect(permissions).not.toContain('milestone:create');
      expect(permissions).not.toContain('team:invite');
    });

    it('returns empty array for invalid role', () => {
      const permissions = getPermissionsForRole('invalid_role' as OrgRole);
      expect(permissions).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('returns true when role has the permission', () => {
      expect(hasPermission('org_admin', 'org:edit')).toBe(true);
      expect(hasPermission('event_manager', 'event:create')).toBe(true);
      expect(hasPermission('vendor', 'milestone:view')).toBe(true);
    });

    it('returns false when role lacks the permission', () => {
      expect(hasPermission('vendor', 'event:create')).toBe(false);
      expect(hasPermission('volunteer', 'team:invite')).toBe(false);
      expect(hasPermission('partner', 'org:edit')).toBe(false);
    });

    it('returns false for null role', () => {
      expect(hasPermission(null, 'org:view')).toBe(false);
    });

    it('returns false for undefined role', () => {
      expect(hasPermission(undefined, 'org:view')).toBe(false);
    });

    it('returns false for invalid role', () => {
      expect(hasPermission('invalid' as OrgRole, 'org:view')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true if role has at least one permission', () => {
      expect(hasAnyPermission('vendor', ['event:create', 'event:view'])).toBe(true);
      expect(hasAnyPermission('volunteer', ['org:edit', 'milestone:edit_own'])).toBe(true);
    });

    it('returns false if role has none of the permissions', () => {
      expect(hasAnyPermission('vendor', ['event:create', 'event:edit', 'event:delete'])).toBe(false);
      expect(hasAnyPermission('volunteer', ['team:invite', 'team:remove'])).toBe(false);
    });

    it('returns false for null role', () => {
      expect(hasAnyPermission(null, ['org:view', 'event:view'])).toBe(false);
    });

    it('returns false for undefined role', () => {
      expect(hasAnyPermission(undefined, ['org:view'])).toBe(false);
    });

    it('returns false for empty permission array', () => {
      expect(hasAnyPermission('org_admin', [])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true if role has all permissions', () => {
      expect(hasAllPermissions('org_admin', ['org:edit', 'org:archive', 'org:view'])).toBe(true);
      expect(hasAllPermissions('event_manager', ['event:create', 'event:edit'])).toBe(true);
    });

    it('returns false if role lacks any permission', () => {
      expect(hasAllPermissions('event_manager', ['org:edit', 'event:create'])).toBe(false);
      expect(hasAllPermissions('vendor', ['event:view', 'event:create'])).toBe(false);
    });

    it('returns false for null role', () => {
      expect(hasAllPermissions(null, ['org:view'])).toBe(false);
    });

    it('returns false for undefined role', () => {
      expect(hasAllPermissions(undefined, ['org:view'])).toBe(false);
    });

    it('returns true for empty permission array', () => {
      // All of zero permissions is vacuously true
      expect(hasAllPermissions('vendor', [])).toBe(true);
    });
  });

  describe('canManageTeam', () => {
    it('returns true for org_admin', () => {
      expect(canManageTeam('org_admin')).toBe(true);
    });

    it('returns true for event_manager (can invite)', () => {
      expect(canManageTeam('event_manager')).toBe(true);
    });

    it('returns false for vendor', () => {
      expect(canManageTeam('vendor')).toBe(false);
    });

    it('returns false for partner', () => {
      expect(canManageTeam('partner')).toBe(false);
    });

    it('returns false for volunteer', () => {
      expect(canManageTeam('volunteer')).toBe(false);
    });

    it('returns false for null role', () => {
      expect(canManageTeam(null)).toBe(false);
    });

    it('returns false for undefined role', () => {
      expect(canManageTeam(undefined)).toBe(false);
    });
  });

  describe('canInviteTeam', () => {
    it('returns true for org_admin', () => {
      expect(canInviteTeam('org_admin')).toBe(true);
    });

    it('returns true for event_manager', () => {
      expect(canInviteTeam('event_manager')).toBe(true);
    });

    it('returns false for vendor', () => {
      expect(canInviteTeam('vendor')).toBe(false);
    });

    it('returns false for partner', () => {
      expect(canInviteTeam('partner')).toBe(false);
    });

    it('returns false for volunteer', () => {
      expect(canInviteTeam('volunteer')).toBe(false);
    });

    it('returns false for null role', () => {
      expect(canInviteTeam(null)).toBe(false);
    });
  });

  describe('canManageOrg', () => {
    it('returns true for org_admin', () => {
      expect(canManageOrg('org_admin')).toBe(true);
    });

    it('returns false for event_manager', () => {
      expect(canManageOrg('event_manager')).toBe(false);
    });

    it('returns false for vendor', () => {
      expect(canManageOrg('vendor')).toBe(false);
    });

    it('returns false for partner', () => {
      expect(canManageOrg('partner')).toBe(false);
    });

    it('returns false for volunteer', () => {
      expect(canManageOrg('volunteer')).toBe(false);
    });

    it('returns false for null role', () => {
      expect(canManageOrg(null)).toBe(false);
    });

    it('returns false for undefined role', () => {
      expect(canManageOrg(undefined)).toBe(false);
    });
  });

  describe('canManageEvents', () => {
    it('returns true for org_admin', () => {
      expect(canManageEvents('org_admin')).toBe(true);
    });

    it('returns true for event_manager', () => {
      expect(canManageEvents('event_manager')).toBe(true);
    });

    it('returns false for vendor', () => {
      expect(canManageEvents('vendor')).toBe(false);
    });

    it('returns false for partner', () => {
      expect(canManageEvents('partner')).toBe(false);
    });

    it('returns false for volunteer', () => {
      expect(canManageEvents('volunteer')).toBe(false);
    });

    it('returns false for null role', () => {
      expect(canManageEvents(null)).toBe(false);
    });

    it('returns false for undefined role', () => {
      expect(canManageEvents(undefined)).toBe(false);
    });
  });

  describe('isAdminRole', () => {
    it('returns true for org_admin', () => {
      expect(isAdminRole('org_admin')).toBe(true);
    });

    it('returns true for event_manager', () => {
      expect(isAdminRole('event_manager')).toBe(true);
    });

    it('returns false for vendor', () => {
      expect(isAdminRole('vendor')).toBe(false);
    });

    it('returns false for partner', () => {
      expect(isAdminRole('partner')).toBe(false);
    });

    it('returns false for volunteer', () => {
      expect(isAdminRole('volunteer')).toBe(false);
    });

    it('returns false for null role', () => {
      expect(isAdminRole(null)).toBe(false);
    });

    it('returns false for undefined role', () => {
      expect(isAdminRole(undefined)).toBe(false);
    });
  });

  describe('getAssignableRoles', () => {
    it('org_admin can assign all roles except org_admin', () => {
      const assignable = getAssignableRoles('org_admin');
      expect(assignable).toContain('event_manager');
      expect(assignable).toContain('vendor');
      expect(assignable).toContain('partner');
      expect(assignable).toContain('volunteer');
      expect(assignable).not.toContain('org_admin');
    });

    it('event_manager can assign lower roles', () => {
      const assignable = getAssignableRoles('event_manager');
      expect(assignable).toContain('vendor');
      expect(assignable).toContain('partner');
      expect(assignable).toContain('volunteer');
      expect(assignable).not.toContain('org_admin');
      expect(assignable).not.toContain('event_manager');
    });

    it('vendor cannot assign any roles', () => {
      const assignable = getAssignableRoles('vendor');
      expect(assignable).toEqual([]);
    });

    it('partner cannot assign any roles', () => {
      const assignable = getAssignableRoles('partner');
      expect(assignable).toEqual([]);
    });

    it('volunteer cannot assign any roles', () => {
      const assignable = getAssignableRoles('volunteer');
      expect(assignable).toEqual([]);
    });
  });

  describe('getAllRoles', () => {
    it('returns all roles in sorted order', () => {
      const roles = getAllRoles();
      expect(roles).toHaveLength(5);
      expect(roles[0]).toBe('org_admin');
      expect(roles[1]).toBe('event_manager');
      expect(roles[2]).toBe('vendor');
      expect(roles[3]).toBe('partner');
      expect(roles[4]).toBe('volunteer');
    });
  });
});

describe('permission edge cases', () => {
  it('all roles in OrgRole have permission mappings', () => {
    const allRoles: OrgRole[] = ['org_admin', 'event_manager', 'vendor', 'partner', 'volunteer'];
    allRoles.forEach(role => {
      const permissions = getPermissionsForRole(role);
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
    });
  });

  it('all roles have at least view permissions', () => {
    const allRoles: OrgRole[] = ['org_admin', 'event_manager', 'vendor', 'partner', 'volunteer'];
    allRoles.forEach(role => {
      expect(hasPermission(role, 'org:view')).toBe(true);
      expect(hasPermission(role, 'event:view')).toBe(true);
      expect(hasPermission(role, 'milestone:view')).toBe(true);
      expect(hasPermission(role, 'template:view')).toBe(true);
      expect(hasPermission(role, 'team:view')).toBe(true);
    });
  });

  it('no permission is duplicated in a role', () => {
    const allRoles: OrgRole[] = ['org_admin', 'event_manager', 'vendor', 'partner', 'volunteer'];
    allRoles.forEach(role => {
      const permissions = getPermissionsForRole(role);
      const uniquePermissions = new Set(permissions);
      expect(permissions.length).toBe(uniquePermissions.size);
    });
  });

  it('permission hierarchy is consistent (create implies view)', () => {
    const allRoles: OrgRole[] = ['org_admin', 'event_manager', 'vendor', 'partner', 'volunteer'];
    allRoles.forEach(role => {
      // If can create events, should be able to view events
      if (hasPermission(role, 'event:create')) {
        expect(hasPermission(role, 'event:view')).toBe(true);
      }
      // If can edit milestones, should be able to view milestones
      if (hasPermission(role, 'milestone:edit')) {
        expect(hasPermission(role, 'milestone:view')).toBe(true);
      }
      // If can create templates, should be able to view templates
      if (hasPermission(role, 'template:create')) {
        expect(hasPermission(role, 'template:view')).toBe(true);
      }
    });
  });
});
