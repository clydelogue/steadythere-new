import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTemplate, useUpdateTemplate, useCreateTemplateVersion } from '@/hooks/useTemplates';
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
import { ArrowLeft, Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { MilestoneCategory } from '@/types/database';

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

const EditTemplate = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading, error } = useTemplate(id);
  const updateTemplate = useUpdateTemplate();
  const createVersion = useCreateTemplateVersion();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [milestones, setMilestones] = useState<MilestoneInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize form with template data
  useEffect(() => {
    if (template && !isInitialized) {
      setName(template.name);
      setDescription(template.description || '');
      setMilestones(
        (template.milestone_templates || []).map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description || '',
          category: m.category as MilestoneCategory,
          days_before_event: m.days_before_event,
          estimated_hours: m.estimated_hours || undefined,
        }))
      );
      setIsInitialized(true);
    }
  }, [template, isInitialized]);

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

    if (!id) return;

    setIsSaving(true);

    try {
      // Check if metadata changed
      const metadataChanged =
        name.trim() !== template?.name ||
        (description.trim() || '') !== (template?.description || '');

      // Check if milestones changed
      const originalMilestones = template?.milestone_templates || [];
      const milestonesChanged =
        milestones.length !== originalMilestones.length ||
        milestones.some((m, i) => {
          const orig = originalMilestones[i];
          if (!orig) return true;
          return (
            m.title !== orig.title ||
            (m.description || '') !== (orig.description || '') ||
            m.category !== orig.category ||
            m.days_before_event !== orig.days_before_event ||
            (m.estimated_hours || null) !== (orig.estimated_hours || null)
          );
        });

      // Update metadata if changed
      if (metadataChanged) {
        await updateTemplate.mutateAsync({
          id,
          name: name.trim(),
          description: description.trim() || undefined,
        });
      }

      // Create new version if milestones changed
      if (milestonesChanged) {
        await createVersion.mutateAsync({
          templateId: id,
          changelog: 'Updated milestones via template editor',
          milestones: milestones.map((m) => ({
            title: m.title.trim(),
            description: m.description.trim() || undefined,
            category: m.category,
            days_before_event: m.days_before_event,
            estimated_hours: m.estimated_hours,
          })),
        });
      }

      toast.success('Template updated successfully');
      navigate(`/app/templates/${id}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error('A template with this name already exists');
      } else {
        toast.error('Failed to update template');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Loading..." subtitle="">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !template) {
    return (
      <AppLayout title="Template Not Found" subtitle="">
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">
            The template you're looking for doesn't exist or has been deleted.
          </p>
          <Button asChild>
            <Link to="/app/templates">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Edit Template" subtitle={template.name}>
      <div className="max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to={`/app/templates/${id}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Template
          </Link>
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Details */}
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>
                Current version: v{template.current_version}
              </CardDescription>
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
                    {' '}&middot; Changes will create a new version
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
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
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
                          <div>
                            <Label>Estimated Hours</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="Optional"
                              value={milestone.estimated_hours ?? ''}
                              onChange={(e) =>
                                updateMilestone(
                                  milestone.id,
                                  'estimated_hours',
                                  e.target.value ? parseFloat(e.target.value) : undefined
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
                    Click "Add Milestone" to add one.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link to={`/app/templates/${id}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim() || milestones.length === 0}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditTemplate;
