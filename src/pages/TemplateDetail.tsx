import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTemplate, useDeleteTemplate } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Loader2,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MilestoneCategory } from '@/types/database';

// Category colors for visual distinction
const categoryColors: Record<MilestoneCategory, string> = {
  VENUE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  CATERING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  MARKETING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  LOGISTICS: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PERMITS: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  SPONSORS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  VOLUNTEERS: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  GENERAL: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const TemplateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading, error } = useTemplate(id);
  const deleteTemplate = useDeleteTemplate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success('Template deleted successfully');
      navigate('/templates');
    } catch (err) {
      toast.error('Failed to delete template');
      setIsDeleting(false);
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
            <Link to="/templates">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const milestones = template.milestone_templates || [];

  return (
    <AppLayout
      title={template.name}
      subtitle={template.description || 'Event template'}
    >
      {/* Header actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/templates">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <Badge variant="secondary">v{template.current_version}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/templates/${id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive the template. Events created from this template
                  will not be affected. You can't undo this action.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Milestones section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Milestones</CardTitle>
              <CardDescription>
                {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} in this template
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/templates/${id}/edit`}>
                <Plus className="w-4 h-4 mr-2" />
                Add Milestone
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {milestones.length > 0 ? (
            <div className="space-y-3">
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{milestone.title}</h4>
                      <Badge
                        variant="secondary"
                        className={categoryColors[milestone.category]}
                      >
                        {milestone.category}
                      </Badge>
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {milestone.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {milestone.days_before_event} days before event
                      </span>
                      {milestone.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          ~{milestone.estimated_hours}h
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p>No milestones defined yet.</p>
              <Button variant="link" asChild className="mt-2">
                <Link to={`/templates/${id}/edit`}>Add milestones</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick action to create event */}
      <div className="mt-6 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Create an event from this template</h3>
            <p className="text-sm text-muted-foreground">
              Start a new event with these milestones pre-configured
            </p>
          </div>
          <Button asChild>
            <Link to={`/events/new?template=${id}`}>
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default TemplateDetail;
