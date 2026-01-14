import { useMemo } from 'react';
import { differenceInDays, startOfDay } from 'date-fns';
import type { AttentionItem, Milestone, Event } from '@/types/database';

interface UseAttentionItemsParams {
  milestones: Milestone[];
  events: Event[];
}

export function useAttentionItems({ milestones, events }: UseAttentionItemsParams) {
  const attentionItems = useMemo(() => {
    const today = startOfDay(new Date());
    const items: AttentionItem[] = [];

    milestones.forEach((milestone) => {
      // Skip completed/skipped milestones
      if (milestone.status === 'COMPLETED' || milestone.status === 'SKIPPED') return;

      const dueDate = startOfDay(new Date(milestone.due_date));
      const daysUntilDue = differenceInDays(dueDate, today);
      const event = events.find((e) => e.id === milestone.event_id) || milestone.event;

      if (!event) return;

      let type: AttentionItem['type'] | null = null;

      if (milestone.status === 'BLOCKED') {
        type = 'BLOCKED';
      } else if (daysUntilDue < 0) {
        type = 'OVERDUE';
      } else if (daysUntilDue === 0) {
        type = 'DUE_TODAY';
      } else if (daysUntilDue <= 3) {
        type = 'DUE_SOON';
      }

      if (type) {
        items.push({
          id: `attention-${milestone.id}`,
          type,
          milestone,
          event,
          daysUntilDue,
        });
      }
    });

    // Sort: OVERDUE first, then BLOCKED, then DUE_TODAY, then DUE_SOON
    const priority = { OVERDUE: 0, BLOCKED: 1, DUE_TODAY: 2, DUE_SOON: 3 };
    return items.sort((a, b) => priority[a.type] - priority[b.type]);
  }, [milestones, events]);

  return attentionItems;
}
