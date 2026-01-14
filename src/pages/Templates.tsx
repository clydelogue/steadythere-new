import { AppLayout } from '@/components/layout/AppLayout';
import { useTemplates } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Loader2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

const Templates = () => {
  const { data: templates = [], isLoading } = useTemplates();

  if (isLoading) {
    return (
      <AppLayout title="Event Templates" subtitle="Reusable templates for your events">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Event Templates" subtitle="Reusable templates for your events">
      <div className="flex items-center justify-end mb-6">
        <Button asChild>
          <Link to="/templates/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Link>
        </Button>
      </div>

      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Link key={template.id} to={`/templates/${template.id}`}>
              <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.description && (
                    <CardDescription className="line-clamp-2 mb-3">
                      {template.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{template.milestone_count} milestones</span>
                    {template.last_used_at ? (
                      <span>
                        Used {formatDistanceToNow(new Date(template.last_used_at), { addSuffix: true })}
                      </span>
                    ) : (
                      <span className="italic">Never used</span>
                    )}
                  </div>
                  {template.events_count > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {template.events_count} event{template.events_count !== 1 ? 's' : ''} created
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed border-border">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
            No templates yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create reusable templates to quickly set up events with predefined milestones.
            Templates learn from your past events to improve over time.
          </p>
          <Button asChild>
            <Link to="/templates/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Template
            </Link>
          </Button>
        </div>
      )}
    </AppLayout>
  );
};

export default Templates;
