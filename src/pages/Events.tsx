import { AppLayout } from '@/components/layout/AppLayout';
import { EventCard } from '@/components/dashboard/EventCard';
import { useEvents } from '@/hooks/useEvents';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Calendar, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Events = () => {
  const { data: events = [], isLoading } = useEvents();

  if (isLoading) {
    return (
      <AppLayout title="Events" subtitle="Manage all your events">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Events" subtitle="Manage all your events">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
        <Button asChild>
          <Link to="/events/new">
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Link>
        </Button>
      </div>

      {events.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed border-border">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-heading text-xl font-semibold text-foreground mb-2">No events yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first event to start planning milestones, assigning tasks, and tracking progress.
          </p>
          <Button asChild>
            <Link to="/events/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Event
            </Link>
          </Button>
        </div>
      )}
    </AppLayout>
  );
};

export default Events;
