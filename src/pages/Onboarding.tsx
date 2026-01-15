import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Building, ArrowRight, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Onboarding = () => {
  const { user, organizations, orgsLoaded, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'org' | 'complete'>('org');
  const [orgName, setOrgName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user already has an org, redirect to dashboard immediately
  if (orgsLoaded && organizations.length > 0) {
    return <Navigate to="/" replace />;
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Create organization
      const slug = generateSlug(orgName);
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName, slug })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as org admin
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'org_admin'
        });

      if (memberError) throw memberError;

      // Create default event types
      const defaultEventTypes = [
        { name: 'Annual Gala', icon: '🎭', description: 'Formal fundraising dinner with auction' },
        { name: 'Charity 5K', icon: '🏃', description: 'Community run/walk event' },
        { name: 'Silent Auction', icon: '🔨', description: 'Auction-focused fundraiser' },
        { name: 'Community Fair', icon: '🎪', description: 'Family-friendly outdoor event' },
      ];

      await supabase
        .from('event_types')
        .insert(defaultEventTypes.map(et => ({ ...et, organization_id: org.id })));

      await refreshProfile();
      setStep('complete');
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-background" />
          </div>
          <span className="font-heading font-bold text-2xl">Steady</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 'org' && (
            <motion.div
              key="org"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Building className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="font-heading text-2xl font-semibold mb-2">
                  Set up your organization
                </h2>
                <p className="text-muted-foreground">
                  This is where your team will plan events together
                </p>
              </div>

              <form onSubmit={handleCreateOrg} className="space-y-6">
                <div>
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="e.g., Hope Foundation"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="mt-1.5"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    You can change this later in settings
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting || !orgName.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Create organization
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-status-completed/10 flex items-center justify-center mx-auto mb-6"
              >
                <Check className="w-10 h-10 text-status-completed" />
              </motion.div>
              <h2 className="font-heading text-2xl font-semibold mb-2">
                You're all set!
              </h2>
              <p className="text-muted-foreground mb-6">
                Redirecting you to your dashboard...
              </p>
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
