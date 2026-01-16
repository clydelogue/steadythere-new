import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Calendar,
  Users,
  CheckCircle2,
  ArrowRight,
  Clock,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  {
    icon: Calendar,
    title: 'Smart Milestone Tracking',
    description: 'AI-powered timeline management that keeps your events on track with intelligent reminders and dependencies.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Invite team members, assign tasks, and collaborate seamlessly across your organization.',
  },
  {
    icon: AlertTriangle,
    title: 'Proactive Alerts',
    description: 'Get notified about potential issues before they become problems. Never miss a deadline again.',
  },
  {
    icon: TrendingUp,
    title: 'Progress Insights',
    description: 'Visual dashboards and reports that help you understand event health at a glance.',
  },
];

const stats = [
  { value: '500+', label: 'Nonprofits' },
  { value: '2,000+', label: 'Events Planned' },
  { value: '98%', label: 'On-Time Delivery' },
];

const Landing = () => {
  const { user, isLoading } = useAuth();

  // Redirect authenticated users to the app
  if (!isLoading && user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-background" />
              </div>
              <span className="font-heading font-bold text-xl">Steady</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Button asChild>
                <Link to="/signup">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm font-medium mb-8">
                <Clock className="w-4 h-4" />
                Event planning, simplified
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Event planning made{' '}
                <span className="text-sidebar-primary">steady</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                AI-powered milestone tracking for nonprofits. Stop the chaos of spreadsheets and email chains.
                Start planning events with clarity and confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/signup">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">
                    Sign in to your account
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to plan successful events
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From small community gatherings to large galas, Steady helps you manage every detail.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl border border-border p-6"
              >
                <div className="w-12 h-12 rounded-lg bg-sidebar-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-sidebar-primary" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-sidebar text-sidebar-foreground rounded-2xl p-8 sm:p-12 text-center">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Ready to bring calm to your event planning?
            </h2>
            <p className="text-lg text-sidebar-foreground/70 mb-8 max-w-2xl mx-auto">
              Join hundreds of nonprofits who have transformed their event planning process with Steady.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-6 text-sm text-sidebar-foreground/60">
              <CheckCircle2 className="w-4 h-4" />
              <span>No credit card required</span>
              <span className="mx-2">·</span>
              <CheckCircle2 className="w-4 h-4" />
              <span>14-day free trial</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-background" />
              </div>
              <span className="font-heading font-semibold">Steady</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Steady. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
