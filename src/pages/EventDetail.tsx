import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { MilestoneCard } from '@/components/milestones/MilestoneCard';
import { EditEventDialog } from '@/components/events/EditEventDialog';
import { useEvent } from '@/hooks/useEvents';
import { useUpdateMilestone } from '@/hooks/useMilestones';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Users, 
  FileText, 
  Sparkles,
  ChevronDown,
  Plus,
  Loader2,
  Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MilestoneStatus } from '@/types/database';

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full bg-accent rounded-full"
      />
    </div>
  );
}

const EventDetail = () => {
  const { id } = useParams();
  const { data: event, isLoading } = useEvent(id);
  const updateMilestone = useUpdateMilestone();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <AppLayout title="Loading...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout title="Event Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground">This event doesn't exist.</p>
        </div>
      </AppLayout>
    );
  }

  const handleStatusChange = (milestoneId: string, newStatus: MilestoneStatus) => {
    updateMilestone.mutate({
      id: milestoneId,
      status: newStatus,
      completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : null,
    });
  };

  const milestones = event.milestones || [];
  const completedCount = milestones.filter(m => m.status === 'COMPLETED').length;
  const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  const daysUntilEvent = Math.ceil(
    (new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <AppLayout title={event.name} subtitle={event.event_type?.name}>
      <div className="max-w-5xl">
        {/* Event Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-6 mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4">
              {/* Event meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
                </span>
                {event.venue && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {event.venue}
                  </span>
                )}
                {event.owner && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {event.owner.name || event.owner.email}
                  </span>
                )}
              </div>

              {/* Days countdown */}
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-muted rounded-lg">
                  <span className="text-2xl font-heading font-bold text-foreground">
                    {daysUntilEvent > 0 ? daysUntilEvent : 0}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1.5">
                    {daysUntilEvent > 0 ? 'days to go' : 'days ago'}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2 max-w-md">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-foreground">{progress}%</span>
                </div>
                <ProgressBar progress={progress} />
                <p className="text-xs text-muted-foreground">
                  {completedCount} of {milestones.length} milestones complete
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Event
              </Button>
              <Button className="ai-button" variant="outline">
                <Sparkles className="w-4 h-4" />
                Improve with AI
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="milestones" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 mb-6">
            <TabsTrigger 
              value="milestones"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent pb-3 pt-0"
            >
              Milestones
            </TabsTrigger>
            <TabsTrigger 
              value="team"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent pb-3 pt-0"
            >
              Team
            </TabsTrigger>
            <TabsTrigger 
              value="documents"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent pb-3 pt-0"
            >
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="milestones" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  All Categories
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
                <Button variant="outline" size="sm">
                  All Statuses
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Milestone
              </Button>
            </div>

            <div className="space-y-3">
              {milestones
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                .map((milestone, index) => (
                  <MilestoneCard 
                    key={milestone.id} 
                    milestone={milestone} 
                    index={index}
                    onStatusChange={handleStatusChange}
                  />
                ))}
            </div>

            {milestones.length === 0 && (
              <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                <Sparkles className="w-10 h-10 mx-auto text-ai mb-3" />
                <h3 className="font-heading font-semibold text-foreground mb-1">No milestones yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Let AI generate milestones based on your event type
                </p>
                <Button className="ai-button">
                  <Sparkles className="w-4 h-4" />
                  Generate Milestones
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="team" className="mt-0">
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
              <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-heading font-semibold text-foreground mb-1">Team Management</h3>
              <p className="text-sm text-muted-foreground">
                Assign team members and volunteers to milestones
              </p>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-heading font-semibold text-foreground mb-1">Event Documents</h3>
              <p className="text-sm text-muted-foreground">
                Upload contracts, permits, and marketing materials
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <EditEventDialog 
        event={event} 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
      />
    </AppLayout>
  );
};

export default EventDetail;
