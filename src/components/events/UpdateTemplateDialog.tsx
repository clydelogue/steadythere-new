import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Minus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTemplate } from '@/hooks/useTemplates';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Event, Milestone, MilestoneTemplate } from '@/types/database';

interface UpdateTemplateDialogProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MilestoneDiff {
  type: 'added' | 'removed';
  eventMilestone?: Milestone;
  templateMilestone?: MilestoneTemplate;
  title: string;
}

export function UpdateTemplateDialog({ event, open, onOpenChange }: UpdateTemplateDialogProps) {
  const { data: template, isLoading: templateLoading } = useTemplate(event.event_type_id || undefined);
  const queryClient = useQueryClient();

  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate differences between event milestones and template milestones
  const diffs = useMemo(() => {
    if (!template?.milestone_templates || !event.milestones) {
      return [];
    }

    const templateMilestones = template.milestone_templates;
    const eventMilestones = event.milestones;
    const diffs: MilestoneDiff[] = [];

    // Find milestones in event that aren't in template (added)
    eventMilestones.forEach(em => {
      const matchingTemplate = templateMilestones.find(
        tm => tm.title.toLowerCase() === em.title.toLowerCase()
      );

      if (!matchingTemplate) {
        diffs.push({
          type: 'added',
          eventMilestone: em,
          title: em.title,
        });
      }
    });

    // Find milestones in template that were skipped in event (removed)
    templateMilestones.forEach(tm => {
      const matchingEvent = eventMilestones.find(
        em => em.title.toLowerCase() === tm.title.toLowerCase()
      );

      if (!matchingEvent) {
        diffs.push({
          type: 'removed',
          templateMilestone: tm,
          title: tm.title,
        });
      }
    });

    return diffs;
  }, [template, event.milestones]);

  // Initialize selected changes (default to all additions selected)
  useState(() => {
    const initialSelected = new Set<string>();
    diffs.forEach((diff) => {
      if (diff.type === 'added') {
        initialSelected.add(diff.title);
      }
    });
    setSelectedChanges(initialSelected);
  });

  const toggleChange = (title: string) => {
    const newSelected = new Set(selectedChanges);
    if (newSelected.has(title)) {
      newSelected.delete(title);
    } else {
      newSelected.add(title);
    }
    setSelectedChanges(newSelected);
  };

  const handleSubmit = async () => {
    if (!template || selectedChanges.size === 0) {
      toast.error('Select at least one change to apply');
      return;
    }

    setIsSubmitting(true);

    try {
      // Process selected changes
      for (const diff of diffs) {
        if (!selectedChanges.has(diff.title)) continue;

        if (diff.type === 'added' && diff.eventMilestone) {
          // Add new milestone to template
          const em = diff.eventMilestone;
          const eventDate = new Date(event.event_date);
          const dueDate = new Date(em.due_date);
          const daysBefore = Math.round((eventDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

          const { error } = await supabase
            .from('milestone_templates')
            .insert({
              event_type_id: template.id,
              title: em.title,
              description: em.description,
              category: em.category,
              days_before_event: Math.max(0, daysBefore),
              estimated_hours: em.estimated_hours,
              sort_order: (template.milestone_templates?.length || 0) + 1,
            });

          if (error) throw error;
        } else if (diff.type === 'removed' && diff.templateMilestone) {
          // Remove milestone from template
          const { error } = await supabase
            .from('milestone_templates')
            .delete()
            .eq('id', diff.templateMilestone.id);

          if (error) throw error;
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['template', template.id] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });

      toast.success('Template updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('Failed to update template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addedCount = diffs.filter(d => d.type === 'added').length;
  const removedCount = diffs.filter(d => d.type === 'removed').length;

  if (!event.event_type_id) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Template</DialogTitle>
            <DialogDescription>
              This event wasn't created from a template, so there's nothing to update.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Template</DialogTitle>
          <DialogDescription>
            {templateLoading ? (
              'Loading template...'
            ) : template ? (
              <>
                Save changes from this event back to the "{template.name}" template.
              </>
            ) : (
              'Template not found.'
            )}
          </DialogDescription>
        </DialogHeader>

        {templateLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : diffs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No differences found between this event and the template.</p>
            <p className="text-sm mt-2">
              The milestones match the template exactly.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {addedCount > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-600" />
                  Added Milestones ({addedCount})
                </h4>
                <div className="space-y-2">
                  {diffs
                    .filter(d => d.type === 'added')
                    .map((diff) => (
                      <label
                        key={diff.title}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-green-50 dark:bg-green-950/30 cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedChanges.has(diff.title)}
                          onCheckedChange={() => toggleChange(diff.title)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{diff.title}</p>
                          {diff.eventMilestone?.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {diff.eventMilestone.description}
                            </p>
                          )}
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {diff.eventMilestone?.category}
                          </Badge>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            )}

            {removedCount > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Minus className="w-4 h-4 text-red-600" />
                  Removed Milestones ({removedCount})
                </h4>
                <div className="space-y-2">
                  {diffs
                    .filter(d => d.type === 'removed')
                    .map((diff) => (
                      <label
                        key={diff.title}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-red-50 dark:bg-red-950/30 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedChanges.has(diff.title)}
                          onCheckedChange={() => toggleChange(diff.title)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{diff.title}</p>
                          {diff.templateMilestone?.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {diff.templateMilestone.description}
                            </p>
                          )}
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {diff.templateMilestone?.category}
                          </Badge>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedChanges.size === 0 || diffs.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Update Template
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
