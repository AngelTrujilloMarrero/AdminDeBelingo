import { Event } from '../types/event';
import { ref, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import { getDayClassName } from '../lib/utils';
import { 
  Edit, 
  Trash2, 
  Calendar, 
  Music, 
  MapPin, 
  Clock, 
  Tag,
  Plus,
  AlertCircle
} from 'lucide-react';

interface EventListProps {
  events: Event[];
  onEditEvent: (event: Event) => void;
}

const getDayGradient = (dayName: string): string => {
  const gradients: Record<string, string> = {
    'lunes': 'from-amber-100 to-amber-200 border-amber-300',
    'martes': 'from-orange-100 to-orange-200 border-orange-300',
    'miércoles': 'from-yellow-100 to-yellow-200 border-yellow-300',
    'jueves': 'from-purple-100 to-purple-200 border-purple-300',
    'viernes': 'from-green-100 to-green-200 border-green-300',
    'sabado': 'from-blue-100 to-blue-200 border-blue-300',
    'domingo': 'from-pink-100 to-pink-200 border-pink-300'
  };
  return gradients[dayName] || 'from-gray-100 to-gray-200 border-gray-300';
};

export default function EventList({ events, onEditEvent }: EventListProps) {
  const handleDelete = async (id: string, eventName: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el evento "${eventName}"?`)) {
      try {
        const eventRef = ref(db, `events/${id}`);
        await remove(eventRef);
      } catch (error) {
        console.error('Error al eliminar evento:', error);
        alert('Error al eliminar el evento');
      }
    }
  };

  // Ordenar eventos por fecha y hora
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(`${a.day}T${a.hora}`);
    const dateB = new Date(`${b.day}T${b.hora}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Agrupar eventos por mes
  const groupedEvents = sortedEvents.reduce((groups, event) => {
    const eventDate = new Date(event.day);
    const monthKey = `${eventDate.getFullYear()}-${(eventDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    
    if (!groups[monthKey]) {
      groups[monthKey] = {
        monthName: eventDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        events: []
      };
    }
    
    groups[monthKey].events.push(event);
    return groups;
  }, {} as Record<string, { monthName: string; events: Event[] }>);

  if (events.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gray-100 rounded-full p-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay eventos</h3>
          <p className="text-gray-500">Agrega tu primer evento usando el formulario de arriba.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-8">
        {Object.entries(groupedEvents).map(([monthKey, { monthName, events: monthEvents }]) => (
          <div key={monthKey} className="space-y-4">
            {/* Separador de mes */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gradient-to-r from-indigo-300 to-purple-300"></div>
              </div>
              <div className="relative flex justify-center">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2 rounded-full shadow-lg">
                  <h3 className="text-lg font-bold text-white capitalize">
                    {monthName}
                  </h3>
                </div>
              </div>
            </div>

            {/* Grid de eventos del mes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {monthEvents.map(event => {
                const eventDate = new Date(event.day);
                const dayName = eventDate
                  .toLocaleDateString('es-ES', { weekday: 'long' })
                  .toLowerCase();
                const formattedEventDate = eventDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'short'
                });

                return (
                  <div
                    key={event.id}
                    className={`
                      bg-gradient-to-r ${getDayGradient(dayName)} 
                      rounded-2xl shadow-lg hover:shadow-xl border-2
                      transition-all duration-300 transform hover:scale-[1.02]
                      ${event.editing ? 'ring-2 ring-blue-500' : ''}
                      ${event.cancelado ? 'opacity-60 grayscale' : ''}
                    `}
                  >
                    <div className="p-6">
                      {/* Header del evento */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Calendar className="h-5 w-5 text-gray-600" />
                            <span className="font-bold text-gray-800 capitalize text-lg">
                              {formattedEventDate}
                            </span>
                            {event.cancelado && (
                              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                                Cancelado
                              </span>
                            )}
                          </div>
                          
                          {/* Información principal */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Music className="h-4 w-4 text-gray-600 flex-shrink-0" />
                              <span className="font-semibold text-gray-900">{event.orquesta}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-600 flex-shrink-0" />
                              <span className="text-gray-700">
                                {event.lugar || 'Casco'}, {event.municipio}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-gray-600 flex-shrink-0" />
                                <span className="text-gray-700 font-medium">{event.hora}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Tag className="h-4 w-4 text-gray-600 flex-shrink-0" />
                                <span className="bg-white/60 text-gray-800 text-sm font-medium px-2 py-1 rounded-lg">
                                  {event.tipo}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => onEditEvent(event)}
                            className="flex items-center space-x-1 bg-blue-500 hover:bg-blue-600 
                                       text-white font-medium py-2 px-3 rounded-lg shadow-md 
                                       hover:shadow-lg transform hover:scale-105 active:scale-95 
                                       transition-all duration-200"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="text-sm">Editar</span>
                          </button>
                          
                          <button
                            onClick={() => handleDelete(event.id, event.orquesta)}
                            className="flex items-center space-x-1 bg-red-500 hover:bg-red-600 
                                       text-white font-medium py-2 px-3 rounded-lg shadow-md 
                                       hover:shadow-lg transform hover:scale-105 active:scale-95 
                                       transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-sm">Eliminar</span>
                          </button>
                        </div>
                      </div>

                      {/* Metadatos */}
                      <div className="border-t border-white/30 pt-3 mt-4">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>
                            Agregado: {new Date(event.FechaAgregado).toLocaleDateString('es-ES')}
                          </span>
                          <span>
                            Editado: {event.FechaEditado
                              ? new Date(event.FechaEditado).toLocaleDateString('es-ES')
                              : new Date(event.FechaAgregado).toLocaleDateString('es-ES')
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}