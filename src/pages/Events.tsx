import { AppLayout } from '@/components/layout/AppLayout';
import { EventCard } from '@/components/dashboard/EventCard';
import { mockEvents } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

const Events = () => {
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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockEvents.map((event, index) => (
          <EventCard key={event.id} event={event} index={index} />
        ))}
      </div>
    </AppLayout>
  );
};

export default Events;
