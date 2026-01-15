import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserManagement, OrgMember } from '@/hooks/useUserManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Users,
  UserPlus,
  Building2,
  Calendar,
  Store,
  Handshake,
  Heart,
  MoreHorizontal,
  UserMinus,
  RefreshCw,
} from 'lucide-react';
import type { OrgRole } from '@/types/database';
import {
  ROLE_CONFIG,
  canManageTeam,
  canManageOrg,
  getAssignableRoles,
  getAllRoles,
} from '@/lib/permissions';

const roleIcons: Record<OrgRole, React.ElementType> = {
  org_admin: Building2,
  event_manager: Calendar,
  vendor: Store,
  partner: Handshake,
  volunteer: Heart,
};

const UserManagement = () => {
  const { currentOrg, currentOrgMember, user } = useAuth();
  const { toast } = useToast();
  const {
    members,
    membersByRole,
    isLoading,
    updateRole,
    isUpdatingRole,
    removeMember,
    isRemovingMember,
    inviteMember,
    isInvitingMember,
    refetch,
  } = useUserManagement();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('volunteer');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrgMember | null>(null);
  const [memberToChangeRole, setMemberToChangeRole] = useState<OrgMember | null>(null);
  const [newRoleForMember, setNewRoleForMember] = useState<OrgRole>('volunteer');

  const userRole = currentOrgMember?.role;
  const userCanManageTeam = canManageTeam(userRole);
  const userCanManageOrg = canManageOrg(userRole);
  const assignableRoles = userRole ? getAssignableRoles(userRole) : [];

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    try {
      await inviteMember({ email: inviteEmail, role: inviteRole });
      toast({
        title: 'Member added',
        description: `${inviteEmail} has been added as ${ROLE_CONFIG[inviteRole].label}.`,
      });
      setInviteEmail('');
      setInviteRole('volunteer');
      setIsInviteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error adding member',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      await removeMember(memberToRemove.id);
      toast({
        title: 'Member removed',
        description: `${memberToRemove.profile.name || memberToRemove.profile.email} has been removed.`,
      });
      setMemberToRemove(null);
    } catch (error: any) {
      toast({
        title: 'Error removing member',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleChangeRole = async () => {
    if (!memberToChangeRole) return;

    try {
      await updateRole({ memberId: memberToChangeRole.id, newRole: newRoleForMember });
      toast({
        title: 'Role updated',
        description: `${memberToChangeRole.profile.name || memberToChangeRole.profile.email} is now ${ROLE_CONFIG[newRoleForMember].label}.`,
      });
      setMemberToChangeRole(null);
    } catch (error: any) {
      toast({
        title: 'Error updating role',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const renderMemberCard = (member: OrgMember) => {
    const RoleIcon = roleIcons[member.role];
    const isCurrentUser = member.user_id === user?.id;
    const canModify = userCanManageTeam && !isCurrentUser && assignableRoles.includes(member.role);

    return (
      <div
        key={member.id}
        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(member.profile.name, member.profile.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">
              {member.profile.name || 'No name'}
              {isCurrentUser && <span className="text-muted-foreground ml-2">(You)</span>}
            </p>
            <p className="text-sm text-muted-foreground">{member.profile.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`flex items-center gap-1.5 ${ROLE_CONFIG[member.role].color}`}
          >
            <RoleIcon className="w-3 h-3" />
            {ROLE_CONFIG[member.role].label}
          </Badge>
          {canModify && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setMemberToChangeRole(member);
                    setNewRoleForMember(member.role);
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Change role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setMemberToRemove(member)}
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Remove from organization
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  if (!currentOrg) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage team members and their roles in {currentOrg.name}
            </p>
          </div>
          {userCanManageTeam && (
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Add someone to your organization. They must have an existing account.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              {ROLE_CONFIG[role].label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_CONFIG[inviteRole].description}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={isInvitingMember || !inviteEmail.trim()}>
                    {isInvitingMember && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Add Member
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Role Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getAllRoles().map((role) => {
            const RoleIcon = roleIcons[role];
            const config = ROLE_CONFIG[role];
            const count = membersByRole[role]?.length || 0;

            return (
              <Card key={role} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${config.color.split(' ')[0]}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{config.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {count} member{count !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* All Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>All Members</CardTitle>
                <CardDescription>
                  {members.length} member{members.length !== 1 ? 's' : ''} in your organization
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members found. Add your first team member to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {members.map(renderMemberCard)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remove Member Dialog */}
        <Dialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Member</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove{' '}
                <strong>{memberToRemove?.profile.name || memberToRemove?.profile.email}</strong> from
                the organization? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMemberToRemove(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveMember}
                disabled={isRemovingMember}
              >
                {isRemovingMember && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Remove Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog open={!!memberToChangeRole} onOpenChange={() => setMemberToChangeRole(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role</DialogTitle>
              <DialogDescription>
                Update the role for{' '}
                <strong>
                  {memberToChangeRole?.profile.name || memberToChangeRole?.profile.email}
                </strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={newRoleForMember} onValueChange={(v) => setNewRoleForMember(v as OrgRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {ROLE_CONFIG[role].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {ROLE_CONFIG[newRoleForMember].description}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMemberToChangeRole(null)}>
                Cancel
              </Button>
              <Button onClick={handleChangeRole} disabled={isUpdatingRole}>
                {isUpdatingRole && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default UserManagement;
