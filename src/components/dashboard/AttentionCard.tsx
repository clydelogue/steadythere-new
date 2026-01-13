import { motion } from 'framer-motion';
import { AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttentionItem } from '@/types/steady';
import { format } from 'date-fns';

interface AttentionCardProps {
  item: AttentionItem;
  index: number;
}

const typeConfig = {
  OVERDUE: {
    icon: AlertCircle,
    label: 'Overdue',
    className: 'status-overdue',
    borderColor: 'border-l-status-overdue',
  },
  DUE_TODAY: {
    icon: Clock,
    label: 'Due Today',
    className: 'status-due-soon',
    borderColor: 'border-l-status-due-soon',
  },
  DUE_SOON: {
    icon: Clock,
    label: 'Due Soon',
    className: 'status-due-soon',
    borderColor: 'border-l-status-due-soon',
  },
  BLOCKED: {
    icon: AlertTriangle,
    label: 'Blocked',
    className: 'status-blocked',
    borderColor: 'border-l-status-blocked',
  },
};

export function AttentionCard({ item, index }: AttentionCardProps) {
  const config = typeConfig[item.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "bg-card rounded-lg border border-border p-4 border-l-4 card-interactive cursor-pointer",
        config.borderColor
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("status-badge", config.className)}>
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.event.name}
            </span>
          </div>
          <h4 className="font-medium text-foreground truncate">
            {item.milestone.title}
          </h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            Due {format(item.milestone.dueDate, 'MMM d, yyyy')}
          </p>
        </div>
        {item.milestone.assignee && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {item.milestone.assignee.name.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
