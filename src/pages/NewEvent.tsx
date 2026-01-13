import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockEventTypes } from '@/data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Sparkles, Check, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';

type Step = 'type' | 'details' | 'milestones';

const sampleMilestones = [
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
  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMilestones, setGeneratedMilestones] = useState<typeof sampleMilestones>([]);
  const [selectedMilestones, setSelectedMilestones] = useState<number[]>([]);

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
  };

  const handleGenerateMilestones = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setGeneratedMilestones(sampleMilestones);
    setSelectedMilestones(sampleMilestones.map(m => m.id));
    setIsGenerating(false);
    setStep('milestones');
  };

  const toggleMilestone = (id: number) => {
    setSelectedMilestones(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    // In real app, would save to database
    navigate('/');
  };

  const selectedEventType = mockEventTypes.find(t => t.id === selectedType);

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
          {/* Step 1: Event Type */}
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
                  What type of event are you planning?
                </h2>
                <p className="text-muted-foreground">
                  We'll customize milestones based on your event type
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {mockEventTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    className={cn(
                      "p-6 rounded-xl border-2 text-left transition-all",
                      selectedType === type.id
                        ? "border-foreground bg-muted"
                        : "border-border hover:border-foreground/30 hover:bg-muted/50"
                    )}
                  >
                    <span className="text-3xl mb-3 block">{type.icon}</span>
                    <h3 className="font-heading font-semibold text-foreground mb-1">
                      {type.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-4">
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
                <span className="text-4xl mb-3 block">{selectedEventType?.icon}</span>
                <h2 className="font-heading text-2xl font-semibold text-foreground mb-2">
                  Tell us about your {selectedEventType?.name}
                </h2>
                <p className="text-muted-foreground">
                  These details help us generate better milestones
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    placeholder={`e.g., Annual ${selectedEventType?.name} 2026`}
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
                  onClick={handleGenerateMilestones}
                  disabled={!eventName || !eventDate || isGenerating}
                  className="ai-button bg-ai text-white hover:bg-ai/90"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Milestones
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
                <div className="w-12 h-12 rounded-full bg-ai/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-ai" />
                </div>
                <h2 className="font-heading text-2xl font-semibold text-foreground mb-2">
                  Here's your milestone plan
                </h2>
                <p className="text-muted-foreground">
                  Review and customize these AI-generated milestones
                </p>
              </div>

              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                {generatedMilestones.map((milestone, index) => (
                  <motion.div
                    key={milestone.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "p-4 flex items-start gap-3 transition-colors",
                      !selectedMilestones.includes(milestone.id) && "opacity-50"
                    )}
                  >
                    <button
                      onClick={() => toggleMilestone(milestone.id)}
                      className={cn(
                        "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        selectedMilestones.includes(milestone.id)
                          ? "bg-foreground border-foreground text-background"
                          : "border-muted-foreground"
                      )}
                    >
                      {selectedMilestones.includes(milestone.id) && (
                        <Check className="w-3 h-3" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{milestone.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {milestone.daysBeforeEvent} days before event
                      </p>
                    </div>
                    <span className="ai-indicator flex-shrink-0">
                      <Sparkles className="w-3 h-3" />
                    </span>
                  </motion.div>
                ))}
              </div>

              <p className="text-sm text-center text-muted-foreground">
                {selectedMilestones.length} of {generatedMilestones.length} milestones selected
              </p>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep('details')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleCreate}>
                  Create Event
                  <ArrowRight className="w-4 h-4 ml-2" />
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
