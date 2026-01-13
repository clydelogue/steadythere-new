import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Milestone } from '@/types/database';

interface WeekCalendarProps {
  milestones: Milestone[];
}

export function WeekCalendar({ milestones }: WeekCalendarProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  const getMilestonesForDay = (date: Date) => {
    return milestones.filter(m => isSameDay(new Date(m.due_date), date));
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-heading font-semibold text-foreground">This Week</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
        </p>
      </div>
      
      <div className="grid grid-cols-7 divide-x divide-border">
        {weekDays.map((day, index) => {
          const dayMilestones = getMilestonesForDay(day);
          const isCurrentDay = isToday(day);
          
          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "min-h-[120px] p-2",
                isCurrentDay && "bg-accent/5"
              )}
            >
              <div className={cn(
                "text-center mb-2 pb-2 border-b border-border",
                isCurrentDay && "text-accent"
              )}>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-lg font-semibold",
                  isCurrentDay ? "text-accent" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </div>
              </div>

              <div className="space-y-1">
                {dayMilestones.slice(0, 3).map((milestone) => {
                  const dueDate = new Date(milestone.due_date);
                  return (
                    <div
                      key={milestone.id}
                      className={cn(
                        "text-xs p-1.5 rounded-md truncate cursor-pointer transition-colors",
                        milestone.status === 'COMPLETED'
                          ? "bg-status-completed/10 text-status-completed line-through"
                          : dueDate < new Date()
                          ? "bg-status-overdue/10 text-status-overdue"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                      title={milestone.title}
                    >
                      {milestone.title}
                    </div>
                  );
                })}
                {dayMilestones.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{dayMilestones.length - 3} more
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
