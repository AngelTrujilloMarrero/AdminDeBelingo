import { Event } from '../types/event';
import Calendar from './Calendar';
import EventForm from './EventForm';
import EventList from './EventList';
import Filters from './Filters';
import SocialStatsSync from './SocialStatsSync';

interface MainPageProps {
    events: Event[];
    filteredEvents: Event[];
    editingEvent: Event | null;
    onDateSelect: (date: string) => void;
    onEventAdded: () => void;
    onEditEvent: (event: Event) => void;
    onCancelEdit: () => void;
    onFilterChange: (filtered: Event[]) => void;
}

export default function MainPage({
    events,
    filteredEvents,
    editingEvent,
    onDateSelect,
    onEventAdded,
    onEditEvent,
    onCancelEdit,
    onFilterChange
}: MainPageProps) {
    return (
        <div className="space-y-8 pb-8 animate-fade-in">
            {/* Sección de calendarios */}
            <section className="pt-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Calendar onDateSelect={onDateSelect} />
                </div>
            </section>

            {/* Sección del formulario */}
            <section>
                <EventForm
                    events={events}
                    editingEvent={editingEvent}
                    onEventAdded={onEventAdded}
                    onCancelEdit={onCancelEdit}
                />
            </section>

            {/* Sección de filtros */}
            <section>
                <Filters events={events} onFilterChange={onFilterChange} />
            </section>

            {/* Sección de eventos */}
            <section>
                <EventList events={filteredEvents} onEditEvent={onEditEvent} />
            </section>

            {/* Sección de sincronización de redes sociales */}
            <section>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <SocialStatsSync />
                </div>
            </section>
        </div>
    );
}
