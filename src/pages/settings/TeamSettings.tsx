import { useState } from 'react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, UserPlus, Crown, Shield, User } from 'lucide-react';
import type { OrgRole } from '@/types/database';

interface TeamMember {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

const roleIcons: Record<OrgRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const roleLabels: Record<OrgRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

const roleColors: Record<OrgRole, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  member: 'bg-muted text-muted-foreground',
};

const TeamSettings = () => {
  const { currentOrg, currentOrgMember } = useAuth();
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ['team-members', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          profile:profiles!organization_members_user_id_fkey(
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!currentOrg,
  });

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentOrg) return;

    setIsInviting(true);
    try {
      // For now, just show a message since we don't have a full invite system
      toast({
        title: 'Invite feature coming soon',
        description: `We'll notify ${inviteEmail} when invites are ready.`,
      });
      setInviteEmail('');
    } catch (error: any) {
      toast({
        title: 'Error sending invite',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const canManageTeam = currentOrgMember?.role === 'owner' || currentOrgMember?.role === 'admin';

  if (!currentOrg) {
    return (
      <SettingsLayout title="Team" description="Manage your team members">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="Team" description="Manage your team members">
      <div className="space-y-6">
        {/* Invite Members */}
        {canManageTeam && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Invite Team Member</CardTitle>
                  <CardDescription>Add someone to your organization</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
                  {isInviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Members List */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Team Members</CardTitle>
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
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const RoleIcon = roleIcons[member.role];
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(member.profile.name, member.profile.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {member.profile.name || 'No name'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.profile.email}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={`flex items-center gap-1.5 ${roleColors[member.role]}`}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {roleLabels[member.role]}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
};

export default TeamSettings;
