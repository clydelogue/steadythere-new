import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useInvitationByToken, useAcceptInvitation } from '@/hooks/useInvitations';
import { ROLE_CONFIG } from '@/lib/permissions';
import type { OrgRole } from '@/types/database';
import { toast } from 'sonner';

const JoinInvitation = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signIn, signUp, refreshOrganizations } = useAuth();

  const { data: invitation, isLoading: invitationLoading, error: invitationError } = useInvitationByToken(token);
  const { mutateAsync: acceptInvitation, isPending: isAccepting } = useAcceptInvitation();

  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptanceComplete, setAcceptanceComplete] = useState(false);

  // Pre-fill email from invitation
  useEffect(() => {
    if (invitation?.email) {
      setEmail(invitation.email);
    }
  }, [invitation?.email]);

  // Auto-accept invitation if user is already logged in
  useEffect(() => {
    const handleAutoAccept = async () => {
      if (user && invitation && token && !acceptanceComplete && !isAccepting) {
        try {
          const result = await acceptInvitation({ token, userId: user.id });
          if (result.success) {
            setAcceptanceComplete(true);
            await refreshOrganizations();
            toast.success(`You've joined ${invitation.organization_name}!`);
            // Navigate to the org/event
            if (result.event_id) {
              navigate(`/events/${result.event_id}`, { replace: true });
            } else {
              navigate('/', { replace: true });
            }
          } else {
            toast.error(result.error || 'Failed to accept invitation');
          }
        } catch (error: any) {
          toast.error(error.message || 'Failed to accept invitation');
        }
      }
    };

    handleAutoAccept();
  }, [user, invitation, token, acceptanceComplete, isAccepting, acceptInvitation, navigate, refreshOrganizations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
          setIsSubmitting(false);
          return;
        }
        // Auto-accept will handle the rest via useEffect
      } else {
        const { data, error } = await signUp(email, password, name);
        if (error) {
          toast.error(error.message);
          setIsSubmitting(false);
          return;
        }

        // If email confirmation is required
        if (!data.session) {
          toast.success('Account created! Please check your email to confirm, then sign in.');
          setMode('signin');
          setIsSubmitting(false);
          return;
        }

        // If auto-signed in, accept invitation
        if (data.user) {
          try {
            const result = await acceptInvitation({ token, userId: data.user.id });
            if (result.success) {
              setAcceptanceComplete(true);
              await refreshOrganizations();
              toast.success(`Welcome! You've joined ${invitation?.organization_name}`);
              if (result.event_id) {
                navigate(`/events/${result.event_id}`, { replace: true });
              } else {
                navigate('/', { replace: true });
              }
            }
          } catch (acceptError: any) {
            toast.error(acceptError.message || 'Account created but failed to join organization');
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (authLoading || invitationLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid or expired invitation
  if (!invitation || invitationError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-6">
              Please contact the person who invited you for a new invitation.
            </p>
            <Button asChild>
              <Link to="/auth">Go to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Acceptance in progress (logged in user)
  if (user && !acceptanceComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <CardTitle>Accepting Invitation</CardTitle>
            <CardDescription>
              Please wait while we add you to {invitation.organization_name}...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Acceptance complete
  if (acceptanceComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>You're In!</CardTitle>
            <CardDescription>
              You've successfully joined {invitation.organization_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/', { replace: true })}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleConfig = ROLE_CONFIG[invitation.role as OrgRole];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Invitation Details */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar text-sidebar-foreground p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-2xl">Steady</span>
          </div>

          <div className="max-w-md">
            <h1 className="font-heading text-3xl font-bold mb-6">
              You're invited!
            </h1>

            <div className="space-y-6">
              {/* Inviter info */}
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-sidebar-accent">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-sidebar-foreground/60">Invited by</p>
                  <p className="font-medium">{invitation.inviter_name || invitation.inviter_email}</p>
                </div>
              </div>

              {/* Organization */}
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-sidebar-accent">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-sidebar-foreground/60">Organization</p>
                  <p className="font-medium">{invitation.organization_name}</p>
                </div>
              </div>

              {/* Event (if applicable) */}
              {invitation.event_name && (
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-sidebar-accent">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-sidebar-foreground/60">Event</p>
                    <p className="font-medium">{invitation.event_name}</p>
                  </div>
                </div>
              )}

              {/* Role */}
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-sidebar-accent">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-sidebar-foreground/60">Your role</p>
                  <Badge variant="secondary" className="mt-1">
                    {roleConfig?.label || invitation.role}
                  </Badge>
                  {roleConfig && (
                    <p className="text-sm text-sidebar-foreground/60 mt-1">
                      {roleConfig.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Personal message */}
              {invitation.message && (
                <div className="mt-8 p-4 rounded-lg bg-sidebar-accent/50 border-l-4 border-sidebar-primary">
                  <p className="text-sm italic">"{invitation.message}"</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-sm text-sidebar-foreground/60">
          Event planning made steady
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile invitation summary */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-background" />
              </div>
              <span className="font-heading font-bold text-2xl">Steady</span>
            </div>

            <Card className="mb-6">
              <CardContent className="pt-4">
                <p className="text-sm text-center text-muted-foreground">
                  <strong>{invitation.inviter_name || 'Someone'}</strong> from{' '}
                  <strong>{invitation.organization_name}</strong> invited you
                  {invitation.event_name && (
                    <> to collaborate on <strong>{invitation.event_name}</strong></>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h2 className="font-heading text-2xl font-semibold mb-2">
              {mode === 'signin' ? 'Sign in to accept' : 'Create your account'}
            </h2>
            <p className="text-muted-foreground mb-8">
              {mode === 'signin'
                ? 'Sign in to accept your invitation'
                : 'Create an account to join the team'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <Label htmlFor="name">Name</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required={mode === 'signup'}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {email !== invitation.email && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Note: Using a different email than invited ({invitation.email})
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isAccepting}
              >
                {isSubmitting || isAccepting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'signin' ? 'Sign in & Accept' : 'Create Account & Join'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default JoinInvitation;
