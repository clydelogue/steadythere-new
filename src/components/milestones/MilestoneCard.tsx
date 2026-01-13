import { motion } from 'framer-motion';
import { Check, Sparkles, Clock, AlertCircle, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Milestone, MilestoneStatus } from '@/types/database';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface MilestoneCardProps {
  milestone: Milestone;
  index: number;
  onStatusChange?: (id: string, status: MilestoneStatus) => void;
}

const statusConfig: Record<MilestoneStatus, { icon: typeof Check; label: string; className: string }> = {
  NOT_STARTED: { icon: Clock, label: 'Not Started', className: 'text-muted-foreground' },
  IN_PROGRESS: { icon: Clock, label: 'In Progress', className: 'text-status-due-soon' },
  BLOCKED: { icon: Pause, label: 'Blocked', className: 'text-status-blocked' },
  COMPLETED: { icon: Check, label: 'Completed', className: 'text-status-completed' },
  SKIPPED: { icon: AlertCircle, label: 'Skipped', className: 'text-muted-foreground' },
};

const categoryColors: Record<string, string> = {
  VENUE: 'bg-blue-100 text-blue-700',
  CATERING: 'bg-orange-100 text-orange-700',
  MARKETING: 'bg-pink-100 text-pink-700',
  LOGISTICS: 'bg-slate-100 text-slate-700',
  PERMITS: 'bg-red-100 text-red-700',
  SPONSORS: 'bg-green-100 text-green-700',
  VOLUNTEERS: 'bg-purple-100 text-purple-700',
  GENERAL: 'bg-gray-100 text-gray-700',
};

export function MilestoneCard({ milestone, index, onStatusChange }: MilestoneCardProps) {
  const dueDate = new Date(milestone.due_date);
  const isOverdue = dueDate < new Date() && milestone.status !== 'COMPLETED' && milestone.status !== 'SKIPPED';
  const config = statusConfig[milestone.status];

  const handleComplete = () => {
    onStatusChange?.(milestone.id, milestone.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "bg-card rounded-lg border border-border p-4 card-interactive group",
        milestone.status === 'COMPLETED' && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={milestone.status === 'COMPLETED'}
          onCheckedChange={handleComplete}
          className={cn(
            "mt-1",
            milestone.status === 'COMPLETED' && "border-status-completed bg-status-completed"
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("px-2 py-0.5 text-xs font-medium rounded", categoryColors[milestone.category])}>
              {milestone.category}
            </span>
            {milestone.is_ai_generated && (
              <span className="ai-indicator">
                <Sparkles className="w-3 h-3 animate-sparkle" />
                <span className="hidden sm:inline">AI</span>
              </span>
            )}
          </div>

          <h4 className={cn(
            "font-medium text-foreground",
            milestone.status === 'COMPLETED' && "line-through"
          )}>
            {milestone.title}
          </h4>

          {milestone.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {milestone.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className={cn(
              "flex items-center gap-1",
              isOverdue ? "text-status-overdue font-medium" : "text-muted-foreground"
            )}>
              {isOverdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {isOverdue ? 'Overdue' : format(dueDate, 'MMM d')}
            </span>

            {milestone.assignee && (
              <span className="text-muted-foreground">
                {milestone.assignee.name || milestone.assignee.email}
              </span>
            )}
          </div>
        </div>

        {/* AI Improve Button - shows on hover */}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity ai-button"
        >
          <Sparkles className="w-3 h-3" />
          Improve
        </Button>
      </div>
    </motion.div>
  );
}
