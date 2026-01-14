import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTemplates, useTemplate } from '@/hooks/useTemplates';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Sparkles, Check, ArrowRight, ArrowLeft, Loader2, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { EditableMilestoneList } from '@/components/events/EditableMilestoneList';
import type { EditableMilestone } from '@/components/events/EditableMilestoneItem';

type MilestoneCategory = Database['public']['Enums']['milestone_category'];
type Step = 'type' | 'details' | 'milestones';

const sampleMilestones: EditableMilestone[] = [
  { id: 1, title: 'Book venue and sign contract', category: 'VENUE', daysBeforeEvent: 90 },
  { id: 2, title: 'Finalize catering menu and confirm headcount', category: 'CATERING', daysBeforeEvent: 60 },
  { id: 3, title: 'Design and send save-the-date invitations', category: 'MARKETING', daysBeforeEvent: 75 },
  { id: 4, title: 'Confirm keynote speaker and travel arrangements', category: 'LOGISTICS', daysBeforeEvent: 45 },
  { id: 5, title: 'Recruit and confirm silent auction sponsors', category: 'SPONSORS', daysBeforeEvent: 50 },
  { id: 6, title: 'Design event program and print materials', category: 'MARKETING', daysBeforeEvent: 30 },
  { id: 7, title: 'Recruit event day volunteers', category: 'VOLUNTEERS', daysBeforeEvent: 21 },
  { id: 8, title: 'Send final invitation and RSVP reminders', category: 'MARKETING', daysBeforeEvent: 14 },
  { id: 9, title: 'Confirm AV equipment and test setup', category: 'LOGISTICS', daysBeforeEvent: 7 },
  { id: 10, title: 'Final walkthrough with venue', category: 'VENUE', daysBeforeEvent: 3 },
];

const NewEvent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrg, user } = useAuth();
  const { data: templates = [], isLoading: templatesLoading } = useTemplates();

  // Support pre-selecting a template via ?template=:id
  const preselectedTemplateId = searchParams.get('template');

  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<string | null>(preselectedTemplateId);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedMilestones, setGeneratedMilestones] = useState<EditableMilestone[]>([]);
  const [selectedMilestones, setSelectedMilestones] = useState<number[]>([]);

  // Fetch selected template's milestones
  const { data: selectedTemplate, isLoading: templateLoading } = useTemplate(selectedType || undefined);

  // Skip to details if template is preselected
  useEffect(() => {
    if (preselectedTemplateId && selectedTemplate && step === 'type') {
      setStep('details');
    }
  }, [preselectedTemplateId, selectedTemplate, step]);

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
  };

  const handleLoadMilestones = async () => {
    if (!selectedTemplate?.milestone_templates) {
      toast.error('No milestones found in this template');
      return;
    }

    setIsGenerating(true);

    // Convert template milestones to editable format
    const milestones: EditableMilestone[] = selectedTemplate.milestone_templates.map((m, index) => ({
      id: index + 1,
      title: m.title,
      category: m.category,
      daysBeforeEvent: m.days_before_event,
      description: m.description || undefined,
      estimatedHours: m.estimated_hours || undefined,
    }));

    setGeneratedMilestones(milestones);
    setSelectedMilestones(milestones.map(m => m.id));
    setIsGenerating(false);
    setStep('milestones');
  };


  const handleCreate = async () => {
    if (!currentOrg || !user) {
      toast.error('You must be logged in to create an event');
      return;
    }

    setIsCreating(true);
    try {
      // Get the template version ID if using a template
      let templateVersionId = null;
      if (selectedTemplate) {
        const { data: version } = await supabase
          .from('template_versions')
          .select('id')
          .eq('event_type_id', selectedTemplate.id)
          .eq('version', selectedTemplate.current_version)
          .single();
        templateVersionId = version?.id || null;
      }

      // Create the event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          name: eventName,
          event_date: eventDate,
          venue: venue || null,
          description: description || null,
          event_type_id: selectedType,
          template_version_id: templateVersionId,
          organization_id: currentOrg.id,
          owner_id: user.id,
          status: 'PLANNING'
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create the selected milestones
      const milestonesToCreate = generatedMilestones
        .filter(m => selectedMilestones.includes(m.id))
        .map((m, index) => {
          const eventDateObj = parseISO(eventDate);
          const dueDate = subDays(eventDateObj, m.daysBeforeEvent);

          return {
            title: m.title,
            category: m.category,
            due_date: format(dueDate, 'yyyy-MM-dd'),
            event_id: event.id,
            status: 'NOT_STARTED' as const,
            is_ai_generated: false, // From template, not AI generated
            sort_order: index
          };
        });

      if (milestonesToCreate.length > 0) {
        const { error: milestonesError } = await supabase
          .from('milestones')
          .insert(milestonesToCreate);

        if (milestonesError) throw milestonesError;
      }

      toast.success('Event created successfully!');
      navigate(`/events/${event.id}`);
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(error.message || 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  if (templatesLoading) {
    return (
      <AppLayout title="Create New Event" subtitle="Let's set up your event">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Create New Event" subtitle="Let's set up your event">
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['type', 'details', 'milestones'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step === s ? "bg-foreground text-background" :
                ['type', 'details', 'milestones'].indexOf(step) > i ? "bg-accent text-accent-foreground" :
                "bg-muted text-muted-foreground"
              )}>
                {['type', 'details', 'milestones'].indexOf(step) > i ? (
                  <Check className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && <div className="w-16 h-0.5 bg-muted" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Template Selection */}
          {step === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="font-heading text-2xl font-semibold text-foreground mb-2">
                  Choose a template for your event
                </h2>
                <p className="text-muted-foreground">
                  Templates include pre-configured milestones to help you get started
                </p>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No templates yet. Create one to get started.</p>
                  <Button asChild variant="outline">
                    <Link to="/templates/new">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTypeSelect(template.id)}
                      className={cn(
                        "p-6 rounded-xl border-2 text-left transition-all",
                        selectedType === template.id
                          ? "border-foreground bg-muted"
                          : "border-border hover:border-foreground/30 hover:bg-muted/50"
                      )}
                    >
                      <FileText className="w-8 h-8 mb-3 text-primary" />
                      <h3 className="font-heading font-semibold text-foreground mb-1">
                        {template.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description || `${template.milestone_count} milestones`}
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        v{template.current_version} &middot; {template.milestone_count} milestones
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep('details')} disabled={!selectedType}>
                  Skip template
                </Button>
                <Button
                  onClick={() => setStep('details')}
                  disabled={!selectedType}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Event Details */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <FileText className="w-12 h-12 mx-auto mb-3 text-primary" />
                <h2 className="font-heading text-2xl font-semibold text-foreground mb-2">
                  Tell us about your {selectedTemplate?.name || 'event'}
                </h2>
                <p className="text-muted-foreground">
                  We'll use the template milestones as a starting point
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    placeholder={`e.g., Annual ${selectedTemplate?.name || 'Event'} 2026`}
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="date">Event Date</Label>
                  <div className="relative mt-1.5">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="date"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="pl-10"
                      min={format(addDays(new Date(), 7), 'yyyy-MM-dd')}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="venue">Venue (optional)</Label>
                  <Input
                    id="venue"
                    placeholder="e.g., The Grand Ballroom"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of your event..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1.5"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep('type')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleLoadMilestones}
                  disabled={!eventName || !eventDate || isGenerating || templateLoading}
                >
                  {isGenerating || templateLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Review Milestones
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review Milestones */}
          {step === 'milestones' && (
            <motion.div
              key="milestones"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h2 className="font-heading text-2xl font-semibold text-foreground mb-2">
                  Review your milestones
                </h2>
                <p className="text-muted-foreground">
                  {selectedTemplate?.name ? `Based on "${selectedTemplate.name}" template. ` : ''}
                  Customize as needed before creating.
                </p>
              </div>

              <EditableMilestoneList
                milestones={generatedMilestones}
                selectedIds={selectedMilestones}
                onMilestonesChange={setGeneratedMilestones}
                onSelectedChange={setSelectedMilestones}
              />

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep('details')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Event
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default NewEvent;
