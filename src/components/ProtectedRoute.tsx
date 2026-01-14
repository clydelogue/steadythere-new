import { forwardRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrg?: boolean;
}

export const ProtectedRoute = forwardRef<HTMLDivElement, ProtectedRouteProps>(
  function ProtectedRoute({ children, requireOrg = true }, ref) {
    const { user, isLoading, organizations, orgsLoaded } = useAuth();
    const location = useLocation();

    // Wait for both auth AND org data to load before making decisions
    if (isLoading || !orgsLoaded) {
      return (
        <div ref={ref} className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    // If user has no org and needs one, redirect to onboarding
    if (requireOrg && organizations.length === 0) {
      return <Navigate to="/onboarding" replace />;
    }

    return <>{children}</>;
  }
);
