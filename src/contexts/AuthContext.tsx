import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Organization, OrganizationMember, OrgRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  currentOrg: Organization | null;
  currentOrgMember: OrganizationMember | null;
  organizations: OrganizationMember[];
  isLoading: boolean;
  orgsLoaded: boolean; // New flag to track if orgs have been fetched
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMember[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orgsLoaded, setOrgsLoaded] = useState(false);

  const currentOrgMember = organizations.find(om => om.organization_id === currentOrgId) || organizations[0] || null;
  const currentOrg = currentOrgMember?.organization || null;

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data as Profile | null;
  };

  // Fetch user's organizations
  const fetchOrganizations = async (userId: string) => {
    const { data } = await supabase
      .from('organization_members')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', userId);
    return (data || []) as OrganizationMember[];
  };

  // Set current org from localStorage or fall back to first org
  const selectCurrentOrg = (orgsData: OrganizationMember[]) => {
    const savedOrgId = localStorage.getItem('steady_current_org');
    if (savedOrgId && orgsData.some(o => o.organization_id === savedOrgId)) {
      setCurrentOrgId(savedOrgId);
    } else if (orgsData.length > 0) {
      setCurrentOrgId(orgsData[0].organization_id);
    }
  };

  // Load user data (profile and organizations)
  const loadUserData = async (userId: string, markOrgsLoaded = true) => {
    const [profileData, orgsData] = await Promise.all([
      fetchProfile(userId),
      fetchOrganizations(userId)
    ]);
    setProfile(profileData);
    setOrganizations(orgsData);
    selectCurrentOrg(orgsData);
    if (markOrgsLoaded) {
      setOrgsLoaded(true);
    }
  };

  // Refresh profile and orgs (public API for components to trigger refresh)
  const refreshProfile = async () => {
    if (!user) return;
    await loadUserData(user.id, false);
  };

  // Set up auth listener
  useEffect(() => {
    let mounted = true;
    let initialSessionChecked = false;

    // Check initial session FIRST
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      initialSessionChecked = true;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          await loadUserData(session.user.id);
        } catch (error) {
          console.error('Failed to load user data:', error);
          setOrgsLoaded(true);
        }
      } else {
        setOrgsLoaded(true);
      }
      setIsLoading(false);
    });

    // Set up listener for SUBSEQUENT auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Skip the initial INITIAL_SESSION event - we handle it above
        if (event === 'INITIAL_SESSION') return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Reset orgsLoaded when auth state changes (new login)
          setOrgsLoaded(false);
          try {
            await loadUserData(session.user.id);
          } catch (error) {
            console.error('Failed to load user data:', error);
            setOrgsLoaded(true);
          }
        } else {
          setProfile(null);
          setOrganizations([]);
          setCurrentOrgId(null);
          setOrgsLoaded(true);
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('steady_current_org');
  };

  const switchOrganization = (orgId: string) => {
    setCurrentOrgId(orgId);
    localStorage.setItem('steady_current_org', orgId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        currentOrg,
        currentOrgMember,
        organizations,
        isLoading,
        orgsLoaded,
        signIn,
        signUp,
        signOut,
        switchOrganization,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
