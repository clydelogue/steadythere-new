import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCreateTemplate } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Plus, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { MilestoneCategory } from '@/types/database';
import { generateAIResponse } from '@/lib/ai';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const CATEGORIES: MilestoneCategory[] = [
  'VENUE',
  'CATERING',
  'MARKETING',
  'LOGISTICS',
  'PERMITS',
  'SPONSORS',
  'VOLUNTEERS',
  'GENERAL',
];

interface MilestoneInput {
  id: string;
  title: string;
  description: string;
  category: MilestoneCategory;
  days_before_event: number;
  estimated_hours: number | undefined;
}

const NewTemplate = () => {
  const navigate = useNavigate();
  const createTemplate = useCreateTemplate();
  const { currentOrg, user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [milestones, setMilestones] = useState<MilestoneInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // AI Generation state
  const [eventDescription, setEventDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: crypto.randomUUID(),
        title: '',
        description: '',
        category: 'GENERAL',
        days_before_event: 30,
        estimated_hours: undefined,
      },
    ]);
  };

  const updateMilestone = (id: string, field: keyof MilestoneInput, value: any) => {
    setMilestones(
      milestones.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleGenerateWithAI = async () => {
    if (!eventDescription.trim()) {
      toast.error('Please describe the event type first');
      return;
    }

    setIsGenerating(true);
    const startTime = Date.now();

    try {
      const systemPrompt = `You are helping a nonprofit executive director create an event template in Steady, an event management platform.

Based on their event description, generate a comprehensive list of milestones (tasks) needed to execute the event.

Output milestones in this JSON format:
<milestones>
[
  {
    "title": "Book venue",
    "description": "Reserve the location and sign contract",
    "category": "VENUE",
    "daysBeforeEvent": 90,
    "estimatedHours": 2
  }
]
</milestones>

Guidelines:
- Generate 8-15 milestones for a typical event
- Space milestones appropriately (venue booking early, final confirmations late)
- Use ONLY these categories: VENUE, CATERING, MARKETING, LOGISTICS, PERMITS, SPONSORS, VOLUNTEERS, GENERAL
- Be practical and comprehensive
- Include setup/teardown tasks near the event date

Also suggest a template name based on the description.
<templateName>Suggested Name Here</templateName>`;

      const result = await generateAIResponse({
        system: systemPrompt,
        messages: [{ role: 'user', content: eventDescription }],
        maxTokens: 2000,
        temperature: 0.7,
      });

      // Log AI action
      if (currentOrg && user) {
        await supabase.from('agent_actions').insert({
          organization_id: currentOrg.id,
          user_id: user.id,
          action_type: 'MILESTONE_GENERATION',
          prompt_summary: eventDescription.substring(0, 500),
          response_summary: result.content.substring(0, 500),
          tokens_used: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
          latency_ms: Date.now() - startTime,
        });
      }

      // Parse milestones from response
      const milestonesMatch = result.content.match(/<milestones>([\s\S]*?)<\/milestones>/);
      const nameMatch = result.content.match(/<templateName>([\s\S]*?)<\/templateName>/);

      if (nameMatch && !name) {
        setName(nameMatch[1].trim());
      }

      if (milestonesMatch) {
        try {
          const parsedMilestones = JSON.parse(milestonesMatch[1]);
          const formattedMilestones: MilestoneInput[] = parsedMilestones.map((m: any) => ({
            id: crypto.randomUUID(),
            title: m.title,
            description: m.description || '',
            category: CATEGORIES.includes(m.category) ? m.category : 'GENERAL',
            days_before_event: m.daysBeforeEvent || 30,
            estimated_hours: m.estimatedHours,
          }));

          setMilestones(formattedMilestones);
          toast.success(`Generated ${formattedMilestones.length} milestones`);
        } catch (parseError) {
          console.error('Failed to parse milestones:', parseError);
          toast.error('Failed to parse AI response. Try again or add milestones manually.');
        }
      } else {
        toast.error('AI did not generate milestones. Try again with more details.');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate milestones. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (milestones.length === 0) {
      toast.error('Add at least one milestone to save this template');
      return;
    }

    const invalidMilestones = milestones.filter((m) => !m.title.trim());
    if (invalidMilestones.length > 0) {
      toast.error('All milestones must have a title');
      return;
    }

    setIsSaving(true);

    try {
      const template = await createTemplate.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        milestones: milestones.map((m) => ({
          title: m.title.trim(),
          description: m.description.trim() || undefined,
          category: m.category,
          days_before_event: m.days_before_event,
          estimated_hours: m.estimated_hours,
        })),
      });

      toast.success('Template created successfully');
      navigate(`/templates/${template.id}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error('A template with this name already exists');
      } else {
        toast.error('Failed to create template');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout title="Create Template" subtitle="Build a reusable event template">
      <div className="max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/templates">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Link>
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AI Generation Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Generate with AI
              </CardTitle>
              <CardDescription>
                Describe your event type and let AI suggest milestones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="eventDescription">Describe this event type</Label>
                <Textarea
                  id="eventDescription"
                  placeholder="e.g., Annual golf tournament fundraiser with 18 holes, lunch, silent auction, and awards dinner. Usually 150 attendees."
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="mt-1.5 min-h-[100px]"
                />
              </div>
              <Button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGenerating || !eventDescription.trim()}
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
            </CardContent>
          </Card>

          {/* Template Details */}
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Golf Tournament"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description for this template"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Milestones</CardTitle>
                  <CardDescription>
                    {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {milestones.length > 0 ? (
                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
                    <div
                      key={milestone.id}
                      className="p-4 rounded-lg border bg-card space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <Label>Title *</Label>
                            <Input
                              placeholder="e.g., Book venue"
                              value={milestone.title}
                              onChange={(e) =>
                                updateMilestone(milestone.id, 'title', e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Category</Label>
                            <Select
                              value={milestone.category}
                              onValueChange={(value) =>
                                updateMilestone(milestone.id, 'category', value)
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Days Before Event</Label>
                            <Input
                              type="number"
                              min="0"
                              value={milestone.days_before_event}
                              onChange={(e) =>
                                updateMilestone(
                                  milestone.id,
                                  'days_before_event',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="mt-1"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Description</Label>
                            <Textarea
                              placeholder="Optional description"
                              value={milestone.description}
                              onChange={(e) =>
                                updateMilestone(milestone.id, 'description', e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeMilestone(milestone.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No milestones yet.</p>
                  <p className="text-sm mt-1">
                    Use AI to generate milestones or add them manually.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link to="/templates">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim() || milestones.length === 0}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Create Template'
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewTemplate;
