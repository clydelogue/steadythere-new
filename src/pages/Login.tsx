import { useState } from 'react';
import { Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Login = () => {
  const { user, isLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the redirect destination from state, or default to /app
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app';

  // Redirect if already logged in
  if (!isLoading && user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Welcome back!');
        navigate(from);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar text-sidebar-foreground p-12 flex-col justify-between">
        <div>
          <Link to="/" className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-2xl">Steady</span>
          </Link>

          <div className="max-w-md">
            <h1 className="font-heading text-4xl font-bold mb-6">
              Welcome back
            </h1>
            <p className="text-lg text-sidebar-foreground/70 leading-relaxed">
              Sign in to continue managing your events with AI-powered milestone tracking.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4 text-sm text-sidebar-foreground/60">
            <div className="flex -space-x-2">
              {['Sarah', 'Michael', 'Emily'].map((name, i) => (
                <img
                  key={i}
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
                  alt={name}
                  className="w-8 h-8 rounded-full border-2 border-sidebar"
                />
              ))}
            </div>
            <span>Trusted by 500+ nonprofits</span>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-background" />
              </div>
              <span className="font-heading font-bold text-2xl">Steady</span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="font-heading text-2xl font-semibold mb-2">
              Sign in
            </h2>
            <p className="text-muted-foreground mb-8">
              Enter your credentials to access your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@organization.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
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
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/signup"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Don't have an account? Sign up
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
