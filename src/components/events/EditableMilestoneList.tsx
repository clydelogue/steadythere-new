import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditableMilestoneItem, EditableMilestone } from './EditableMilestoneItem';
import { motion } from 'framer-motion';

interface EditableMilestoneListProps {
  milestones: EditableMilestone[];
  selectedIds: number[];
  onMilestonesChange: (milestones: EditableMilestone[]) => void;
  onSelectedChange: (ids: number[]) => void;
}

export function EditableMilestoneList({
  milestones,
  selectedIds,
  onMilestonesChange,
  onSelectedChange,
}: EditableMilestoneListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = milestones.findIndex((m) => m.id === active.id);
      const newIndex = milestones.findIndex((m) => m.id === over.id);
      onMilestonesChange(arrayMove(milestones, oldIndex, newIndex));
    }
  };

  const handleToggleSelect = (id: number) => {
    onSelectedChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );
  };

  const handleUpdate = (id: number, updates: Partial<EditableMilestone>) => {
    onMilestonesChange(
      milestones.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      )
    );
  };

  const handleDelete = (id: number) => {
    onMilestonesChange(milestones.filter((m) => m.id !== id));
    onSelectedChange(selectedIds.filter((i) => i !== id));
  };

  const handleAddMilestone = () => {
    const newId = Math.max(0, ...milestones.map((m) => m.id)) + 1;
    const newMilestone: EditableMilestone = {
      id: newId,
      title: 'New milestone',
      category: 'GENERAL',
      daysBeforeEvent: 14,
    };
    onMilestonesChange([...milestones, newMilestone]);
    onSelectedChange([...selectedIds, newId]);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={milestones.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            {milestones.map((milestone, index) => (
              <EditableMilestoneItem
                key={milestone.id}
                milestone={milestone}
                isSelected={selectedIds.includes(milestone.id)}
                onToggleSelect={handleToggleSelect}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                index={index}
              />
            ))}
          </SortableContext>
        </DndContext>

        {milestones.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No milestones yet</p>
          </div>
        )}
      </div>

      {/* Add Milestone Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          variant="outline"
          onClick={handleAddMilestone}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Milestone
        </Button>
      </motion.div>

      {/* Selection Summary */}
      <p className="text-sm text-center text-muted-foreground">
        {selectedIds.length} of {milestones.length} milestones selected
      </p>
    </div>
  );
}
