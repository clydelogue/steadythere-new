import { motion } from 'framer-motion';
import { Calendar, MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Event } from '@/types/steady';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface EventCardProps {
  event: Event;
  index: number;
}

function ProgressRing({ progress, size = 48 }: { progress: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="progress-ring-circle"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          className="progress-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {progress}%
      </span>
    </div>
  );
}

const statusColors: Record<string, string> = {
  PLANNING: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-status-on-track/10 text-status-on-track',
  COMPLETED: 'bg-status-completed/10 text-status-completed',
};

export function EventCard({ event, index }: EventCardProps) {
  const daysUntilEvent = Math.ceil(
    (new Date(event.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/events/${event.id}`}
        className="block bg-card rounded-xl border border-border p-5 card-interactive"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("px-2 py-0.5 text-xs font-medium rounded-md", statusColors[event.status])}>
                {event.status}
              </span>
              {daysUntilEvent > 0 && daysUntilEvent <= 7 && (
                <span className="text-xs text-status-due-soon font-medium">
                  {daysUntilEvent} days away
                </span>
              )}
            </div>
            
            <h3 className="font-heading font-semibold text-lg text-foreground mb-1">
              {event.name}
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(new Date(event.eventDate), 'MMM d, yyyy')}
              </span>
              {event.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {event.venue}
                </span>
              )}
            </div>
          </div>

          <ProgressRing progress={event.progress || 0} />
        </div>

        {/* Milestone summary */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-status-completed font-medium">
              {event.milestones?.filter(m => m.status === 'COMPLETED').length || 0} done
            </span>
            <span className="text-status-overdue font-medium">
              {event.milestones?.filter(m => m.status === 'BLOCKED' || (m.dueDate < new Date() && m.status !== 'COMPLETED')).length || 0} needs attention
            </span>
          </div>
          
          {event.owner && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {event.owner.name}
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
