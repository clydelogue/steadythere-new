import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GripVertical, 
  Check, 
  Trash2, 
  ChevronDown, 
  Sparkles,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { Database } from '@/integrations/supabase/types';

type MilestoneCategory = Database['public']['Enums']['milestone_category'];

export interface EditableMilestone {
  id: number;
  title: string;
  description?: string;
  category: MilestoneCategory;
  daysBeforeEvent: number;
}

interface EditableMilestoneItemProps {
  milestone: EditableMilestone;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onUpdate: (id: number, updates: Partial<EditableMilestone>) => void;
  onDelete: (id: number) => void;
  index: number;
}

const categoryOptions: { value: MilestoneCategory; label: string; color: string }[] = [
  { value: 'VENUE', label: 'Venue', color: 'bg-blue-100 text-blue-700' },
  { value: 'CATERING', label: 'Catering', color: 'bg-orange-100 text-orange-700' },
  { value: 'MARKETING', label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
  { value: 'LOGISTICS', label: 'Logistics', color: 'bg-slate-100 text-slate-700' },
  { value: 'PERMITS', label: 'Permits', color: 'bg-red-100 text-red-700' },
  { value: 'SPONSORS', label: 'Sponsors', color: 'bg-green-100 text-green-700' },
  { value: 'VOLUNTEERS', label: 'Volunteers', color: 'bg-purple-100 text-purple-700' },
  { value: 'GENERAL', label: 'General', color: 'bg-gray-100 text-gray-700' },
];

export function EditableMilestoneItem({
  milestone,
  isSelected,
  onToggleSelect,
  onUpdate,
  onDelete,
  index,
}: EditableMilestoneItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(milestone.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleBlur = () => {
    setIsEditing(false);
    if (editTitle.trim() && editTitle !== milestone.title) {
      onUpdate(milestone.id, { title: editTitle.trim() });
    } else {
      setEditTitle(milestone.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setEditTitle(milestone.title);
      setIsEditing(false);
    }
  };

  const categoryConfig = categoryOptions.find(c => c.value === milestone.category);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "bg-card border-b border-border last:border-b-0 group",
        isDragging && "z-50 shadow-lg bg-card/95 backdrop-blur",
        !isSelected && "opacity-50"
      )}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-1 -ml-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Checkbox */}
        <button
          onClick={() => onToggleSelect(milestone.id)}
          className={cn(
            "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
            isSelected
              ? "bg-foreground border-foreground text-background"
              : "border-muted-foreground hover:border-foreground"
          )}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                {/* Category Badge */}
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded inline-block mb-1",
                  categoryConfig?.color
                )}>
                  {categoryConfig?.label}
                </span>

                {/* Title - Inline Editable */}
                {isEditing ? (
                  <Input
                    ref={inputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    className="h-7 text-sm font-medium py-0"
                  />
                ) : (
                  <p
                    onClick={() => setIsEditing(true)}
                    className="font-medium text-foreground cursor-text hover:bg-muted/50 rounded px-1 -mx-1 py-0.5 transition-colors"
                  >
                    {milestone.title}
                  </p>
                )}

                {/* Due Date Info */}
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {milestone.daysBeforeEvent} days before event
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <span className="ai-indicator flex-shrink-0">
                  <Sparkles className="w-3 h-3" />
                </span>

                <CollapsibleTrigger asChild>
                  <button
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted"
                    aria-label="Expand details"
                  >
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      isExpanded && "rotate-180"
                    )} />
                  </button>
                </CollapsibleTrigger>

                <button
                  onClick={() => onDelete(milestone.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100"
                  aria-label="Delete milestone"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            <CollapsibleContent>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-border space-y-3"
                  >
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Textarea
                        placeholder="Add a description..."
                        value={milestone.description || ''}
                        onChange={(e) => onUpdate(milestone.id, { description: e.target.value })}
                        className="mt-1 text-sm min-h-[60px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <Select
                          value={milestone.category}
                          onValueChange={(value) => onUpdate(milestone.id, { category: value as MilestoneCategory })}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                <span className={cn("px-1.5 py-0.5 rounded text-xs", cat.color)}>
                                  {cat.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Days Before Event</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={milestone.daysBeforeEvent}
                          onChange={(e) => onUpdate(milestone.id, { daysBeforeEvent: parseInt(e.target.value) || 1 })}
                          className="mt-1 h-9"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </motion.div>
  );
}
