import { AppLayout } from '@/components/layout/AppLayout';
import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { EventCard } from '@/components/dashboard/EventCard';
import { WeekCalendar } from '@/components/dashboard/WeekCalendar';
import { useEvents } from '@/hooks/useEvents';
import { useAllMilestones } from '@/hooks/useMilestones';
import { useAttentionItems } from '@/hooks/useAttentionItems';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Calendar, CheckCircle2, Loader2 } from 'lucide-react';

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  trendUp 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? 'text-status-on-track' : 'text-status-overdue'}`}>
              <TrendingUp className={`w-3 h-3 ${!trendUp && 'rotate-180'}`} />
              {trend}
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-lg bg-muted">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

const Dashboard = () => {
  const { profile } = useAuth();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const { data: milestones = [], isLoading: milestonesLoading } = useAllMilestones();
  const attentionItems = useAttentionItems({ milestones, events });

  const isLoading = eventsLoading || milestonesLoading;

  const activeEvents = events.filter(e => e.status === 'ACTIVE' || e.status === 'PLANNING').length;
  const completedMilestones = milestones.filter(m => m.status === 'COMPLETED').length;
  const totalMilestones = milestones.length;
  const overdueCount = attentionItems.filter(a => a.type === 'OVERDUE' || a.type === 'BLOCKED').length;

  const greeting = profile?.name ? `Good morning, ${profile.name.split(' ')[0]}` : 'Good morning';

  if (isLoading) {
    return (
      <AppLayout title="Dashboard" subtitle={greeting}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" subtitle={greeting}>
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={Calendar} 
          label="Active Events" 
          value={activeEvents} 
        />
        <StatCard 
          icon={CheckCircle2} 
          label="Milestones Complete" 
          value={totalMilestones > 0 ? `${completedMilestones}/${totalMilestones}` : '0'}
        />
        <StatCard 
          icon={AlertTriangle} 
          label="Needs Attention" 
          value={overdueCount}
          trend={overdueCount > 0 ? "Action required" : undefined}
          trendUp={false}
        />
        <StatCard 
          icon={TrendingUp} 
          label="On Track" 
          value={totalMilestones > 0 ? `${Math.round((completedMilestones / totalMilestones) * 100)}%` : '0%'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Attention & Events */}
        <div className="xl:col-span-2 space-y-8">
          {/* Attention Needed */}
          {attentionItems.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Attention Needed
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {attentionItems.length} items require your attention
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attentionItems.map((item, index) => (
                  <AttentionCard key={item.id} item={item} index={index} />
                ))}
              </div>
            </section>
          )}

          {/* Active Events */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Active Events
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeEvents} events in progress
                </p>
              </div>
            </div>
            {events.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {events.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-heading font-semibold text-foreground mb-1">No events yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first event to get started
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column - Calendar */}
        <div className="space-y-8">
          <WeekCalendar milestones={milestones} />

          {/* Recent Activity */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-foreground mb-4">
              Recent Activity
            </h3>
            {milestones.length > 0 ? (
              <div className="space-y-3">
                {milestones
                  .filter(m => m.status === 'COMPLETED')
                  .slice(0, 3)
                  .map((milestone, i) => (
                    <motion.div
                      key={milestone.id}
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-status-completed" />
                      <div>
                        <p className="text-foreground">
                          <span className="font-medium">Completed</span> {milestone.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {milestone.completed_at ? new Date(milestone.completed_at).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    </motion.div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
