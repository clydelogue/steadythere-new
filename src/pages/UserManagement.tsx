import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserManagement, OrgMember } from '@/hooks/useUserManagement';
import { useInvitations } from '@/hooks/useInvitations';
import { InviteTeamMemberDialog } from '@/components/InviteTeamMemberDialog';
import { Button } from '@/components/ui/button';
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
  Mail,
  Clock,
  X,
  Send,
} from 'lucide-react';
import type { OrgRole } from '@/types/database';
import {
  ROLE_CONFIG,
  canManageTeam,
  canManageOrg,
  getAssignableRoles,
  getAllRoles,
  canInviteTeam,
} from '@/lib/permissions';
import { formatDistanceToNow } from 'date-fns';

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
  } = useUserManagement();

  const {
    pendingInvitations,
    isLoading: invitationsLoading,
    cancelInvitation,
    isCancellingInvitation,
    resendInvitation,
    isResendingInvitation,
  } = useInvitations();

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrgMember | null>(null);
  const [memberToChangeRole, setMemberToChangeRole] = useState<OrgMember | null>(null);
  const [newRoleForMember, setNewRoleForMember] = useState<OrgRole>('volunteer');
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);

  const userRole = currentOrgMember?.role as OrgRole | undefined;
  const userCanManageTeam = canManageTeam(userRole);
  const userCanManageOrg = canManageOrg(userRole);
  const userCanInvite = canInviteTeam(userRole);
  const assignableRoles = userRole ? getAssignableRoles(userRole) : [];

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
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

  const handleCancelInvitation = async () => {
    if (!invitationToCancel) return;

    try {
      await cancelInvitation(invitationToCancel);
      toast({
        title: 'Invitation cancelled',
        description: 'The invitation has been cancelled.',
      });
      setInvitationToCancel(null);
    } catch (error: any) {
      toast({
        title: 'Error cancelling invitation',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation(invitationId);
      toast({
        title: 'Invitation resent',
        description: 'A new invitation email has been sent.',
      });
    } catch (error: any) {
      toast({
        title: 'Error resending invitation',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const renderMemberCard = (member: OrgMember) => {
    const RoleIcon = roleIcons[member.role as OrgRole] || Users;
    const isCurrentUser = member.user_id === user?.id;
    const canModify = userCanManageTeam && !isCurrentUser && assignableRoles.includes(member.role as OrgRole);

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
            className={`flex items-center gap-1.5 ${ROLE_CONFIG[member.role as OrgRole]?.color || ''}`}
          >
            <RoleIcon className="w-3 h-3" />
            {ROLE_CONFIG[member.role as OrgRole]?.label || member.role}
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
                    setNewRoleForMember(member.role as OrgRole);
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
      <AppLayout title="User Management">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="User Management" subtitle={`Manage team members in ${currentOrg.name}`}>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage team members and their roles in {currentOrg.name}
            </p>
          </div>
          {userCanInvite && (
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Team Member
            </Button>
          )}
        </div>

        {/* Pending Invitations */}
        {userCanInvite && pendingInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle>Pending Invitations</CardTitle>
                  <CardDescription>
                    {pendingInvitations.length} invitation{pendingInvitations.length !== 1 ? 's' : ''} awaiting response
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => {
                  const RoleIcon = roleIcons[invitation.role as OrgRole] || Users;
                  return (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{invitation.email}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Invited {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                            {invitation.event && (
                              <span>
                                to <strong>{invitation.event.name}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`flex items-center gap-1.5 ${ROLE_CONFIG[invitation.role as OrgRole]?.color || ''}`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          {ROLE_CONFIG[invitation.role as OrgRole]?.label || invitation.role}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleResendInvitation(invitation.id)}
                              disabled={isResendingInvitation}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Resend invitation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setInvitationToCancel(invitation.id)}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel invitation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {getAllRoles().map((role) => {
            const RoleIcon = roleIcons[role] || Users;
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
                      <CardTitle className="text-base">{config.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {count} member{count !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
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

        {/* Invite Team Member Dialog */}
        <InviteTeamMemberDialog
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
        />

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

        {/* Cancel Invitation Dialog */}
        <Dialog open={!!invitationToCancel} onOpenChange={() => setInvitationToCancel(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Invitation</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this invitation? The recipient will no longer be able to join using this link.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInvitationToCancel(null)}>
                Keep Invitation
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelInvitation}
                disabled={isCancellingInvitation}
              >
                {isCancellingInvitation && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cancel Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default UserManagement;
