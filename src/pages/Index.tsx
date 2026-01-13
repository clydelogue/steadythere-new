import { AppLayout } from '@/components/layout/AppLayout';
import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { EventCard } from '@/components/dashboard/EventCard';
import { WeekCalendar } from '@/components/dashboard/WeekCalendar';
import { mockEvents, mockAttentionItems, allMilestones } from '@/data/mockData';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';

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
  const activeEvents = mockEvents.filter(e => e.status === 'ACTIVE').length;
  const completedMilestones = allMilestones.filter(m => m.status === 'COMPLETED').length;
  const totalMilestones = allMilestones.length;
  const overdueCount = mockAttentionItems.filter(a => a.type === 'OVERDUE' || a.type === 'BLOCKED').length;

  return (
    <AppLayout title="Dashboard" subtitle="Good morning, Sarah">
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
          value={`${completedMilestones}/${totalMilestones}`}
          trend="+3 this week"
          trendUp
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
          value={`${Math.round((completedMilestones / totalMilestones) * 100)}%`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Attention & Events */}
        <div className="xl:col-span-2 space-y-8">
          {/* Attention Needed */}
          {mockAttentionItems.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Attention Needed
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {mockAttentionItems.length} items require your attention
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mockAttentionItems.map((item, index) => (
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
                  {mockEvents.filter(e => e.status === 'ACTIVE' || e.status === 'PLANNING').length} events in progress
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mockEvents.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          </section>
        </div>

        {/* Right Column - Calendar */}
        <div className="space-y-8">
          <WeekCalendar milestones={allMilestones} />

          {/* Recent Activity */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-heading font-semibold text-foreground mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {[
                { action: 'Completed', item: 'Book venue and confirm contract', time: '2 days ago', icon: CheckCircle2, color: 'text-status-completed' },
                { action: 'Updated', item: 'Finalize catering menu', time: '3 hours ago', icon: Calendar, color: 'text-muted-foreground' },
                { action: 'Blocked', item: 'Submit city permit application', time: 'Yesterday', icon: AlertTriangle, color: 'text-status-blocked' },
              ].map((activity, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 text-sm"
                >
                  <activity.icon className={`w-4 h-4 mt-0.5 ${activity.color}`} />
                  <div>
                    <p className="text-foreground">
                      <span className="font-medium">{activity.action}</span> {activity.item}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
