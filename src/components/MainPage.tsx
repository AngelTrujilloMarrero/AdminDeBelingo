import { useState } from 'react';
import { Event } from '../types/event';
import Calendar from './Calendar';
import EventForm from './EventForm';
import EventList from './EventList';
import Filters from './Filters';
import SocialStatsSync from './SocialStatsSync';

import OrchestraForm from './OrchestraForm';
import FormationTagger from './FormationTagger';
import MessageAdmin from './MessageAdmin';
import ExportFestivalDialog from './ExportFestivalDialog';
import { FileImage } from 'lucide-react';

interface MainPageProps {
    events: Event[];
    filteredEvents: Event[];
    editingEvent: Event | null;
    onDateSelect: (date: string) => void;
    onEventAdded: () => void;
    onEditEvent: (event: Event) => void;
    onCancelEdit: () => void;
    onFilterChange: (filtered: Event[]) => void;
    onClearFilter: () => void;
    allOrchestraNames: string[];
}

export default function MainPage({
    events,
    filteredEvents,
    editingEvent,
    onDateSelect,
    onEventAdded,
    onEditEvent,
    onCancelEdit,
    onFilterChange,
    onClearFilter,
    allOrchestraNames
}: MainPageProps) {
    const [showExportDialog, setShowExportDialog] = useState(false);

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
                    allOrchestraNames={allOrchestraNames}
                />
            </section>

             {/* Sección de Herramientas (Exportar) */}
             <section>
                <div className="max-w-4xl mx-auto px-6 flex justify-center">
                    <button
                        onClick={() => setShowExportDialog(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                    >
                        <FileImage className="w-5 h-5" />
                        Crear Cartel de Fiestas
                    </button>
                </div>
            </section>

            {/* Sección de datos de orquestas */}
            <section>
                <div className="max-w-4xl mx-auto px-6">
                    <OrchestraForm events={events} />
                </div>
            </section>

            {/* Sección de clasificación rápida de formaciones */}
            <section>
                <div className="max-w-4xl mx-auto px-6">
                    <FormationTagger events={events} />
                </div>
            </section>

            {/* Sección de filtros */}
            <section>
                <Filters
                    events={events}
                    onFilterChange={onFilterChange}
                    onClearFilter={onClearFilter}
                />
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

            {/* Sección de administración del chat */}
            <section>
                <div className="max-w-4xl mx-auto px-6">
                    <MessageAdmin />
                </div>
            </section>

            {/* Dialogs */}
            {showExportDialog && (
                <ExportFestivalDialog 
                    events={events} 
                    onClose={() => setShowExportDialog(false)} 
                />
            )}
        </div>
    );
}
