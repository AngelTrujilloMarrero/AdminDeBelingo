import React, { useState } from 'react';
import { Event } from '../types/event';
import { getDayClassName } from '../lib/utils';
import { useEventActions } from '../hooks/useEventActions';
import {
  Edit,
  Trash2,
  Calendar,
  Music,
  MapPin,
  Clock,
  Tag,
  Plus,
  AlertCircle,
  Archive,
  Lock,
  X,
  AlertTriangle,
  CheckCircle2,
  Circle
} from 'lucide-react';

interface EventListProps {
  events: Event[];
  onEditEvent: (event: Event) => void;
}

const getDayGradient = (dayName: string): string => {
  const gradients: Record<string, string> = {
    'lunes': 'from-amber-100 to-amber-200 dark:from-amber-900/50 dark:to-amber-800/50 border-amber-300 dark:border-amber-700',
    'martes': 'from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 border-orange-300 dark:border-orange-700',
    'miércoles': 'from-yellow-100 to-yellow-200 dark:from-yellow-900/50 dark:to-yellow-800/50 border-yellow-300 dark:border-yellow-700',
    'jueves': 'from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 border-purple-300 dark:border-purple-700',
    'viernes': 'from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 border-green-300 dark:border-green-700',
    'sabado': 'from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 border-blue-300 dark:border-blue-700',
    'domingo': 'from-pink-100 to-pink-200 dark:from-pink-900/50 dark:to-pink-800/50 border-pink-300 dark:border-pink-700'
  };
  return gradients[dayName] || 'from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-gray-300 dark:border-gray-600';
};

export default function EventList({ events, onEditEvent }: EventListProps) {
  const { checkIfEventAlreadyDeleted, deleteEvent, checkIfArchived, toggleCompleted } = useEventActions();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDeleteData, setEventToDeleteData] = useState<{ id: string; orquesta: string; eventData: Event } | null>(null);
  const [deletionReason, setDeletionReason] = useState<string>('');
  const [customDeletionReason, setCustomDeletionReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id: string, eventName: string) => {
    const eventToDelete = events.find(e => e.id === id);
    if (!eventToDelete) return;

    if (checkIfArchived(eventToDelete)) {
      alert(`El evento "${eventName}" es de un año anterior y está archivado.\nNo se puede eliminar directamente.`);
      return;
    }

    const alreadyDeleted = await checkIfEventAlreadyDeleted(id, eventToDelete);
    if (alreadyDeleted) {
      alert(`El evento "${eventName}" ya tiene una copia en la papelera.\nNo se pueden duplicar eventos en la papelera.`);
      return;
    }

    setEventToDeleteData({ id, orquesta: eventName, eventData: eventToDelete });
    setDeletionReason('');
    setCustomDeletionReason('');
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventToDeleteData) return;
    
    setIsDeleting(true);
    try {
      const { id, eventData } = eventToDeleteData;
      
      await deleteEvent(id, eventData, deletionReason, customDeletionReason);
      
      setIsDeleteModalOpen(false);
      setEventToDeleteData(null);
      setDeletionReason('');
      setCustomDeletionReason('');
    } catch (error) {
      console.error('Error al eliminar evento:', error);
      alert('Error al eliminar el evento');
    } finally {
      setIsDeleting(false);
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
        <div className="bg-card rounded-2xl shadow-xl border border-border p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-muted rounded-full p-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No hay eventos</h3>
          <p className="text-muted-foreground">Agrega tu primer evento usando el formulario de arriba.</p>
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
                 <div className="w-full border-t-2 border-gradient-to-r from-indigo-300 to-purple-300 dark:from-indigo-600 dark:to-purple-600"></div>
               </div>
               <div className="relative flex justify-center">
                 <div className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 px-6 py-2 rounded-full shadow-lg">
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
                             <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                             <span className="font-bold text-gray-800 dark:text-gray-200 capitalize text-lg">
                               {formattedEventDate}
                             </span>
                             {event.cancelado && (
                               <span className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-xs font-medium px-2 py-1 rounded-full">
                                 Cancelado
                               </span>
                             )}
                             {event.isArchived && (
                               <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-medium px-2 py-1 rounded-full flex items-center space-x-1">
                                 <Archive className="h-3 w-3" />
                                 <span>Archivado</span>
                               </span>
                             )}
                           </div>

                           {/* Información principal */}
                           <div className="space-y-2">
                             <div className="flex items-center space-x-2">
                               <Music className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                               <span className="font-semibold text-gray-900 dark:text-gray-100">{event.orquesta}</span>
                             </div>

                             <div className="flex items-center space-x-2">
                               <MapPin className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                               <span className="text-gray-700 dark:text-gray-300">
                                 {event.lugar || 'Casco'}, {event.municipio}
                               </span>
                             </div>

                             <div className="flex items-center space-x-4">
                               <div className="flex items-center space-x-2">
                                 <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                                 <span className="text-gray-700 dark:text-gray-300 font-medium">{event.hora}</span>
                               </div>

                               <div className="flex items-center space-x-2">
                                 <Tag className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                                 <span className="bg-white/60 dark:bg-black/20 text-gray-800 dark:text-gray-200 text-sm font-medium px-2 py-1 rounded-lg">
                                   {event.tipo}
                                 </span>
                               </div>
                             </div>
                           </div>
                         </div>

                        {/* Botones de acción */}
                        <div className="flex flex-col space-y-2 ml-4">
                          {!event.isArchived ? (
                            <>
                            <button
                              onClick={() => toggleCompleted(event)}
                              className={`flex items-center space-x-1 font-medium py-2 px-3 rounded-lg shadow-md 
                                         hover:shadow-lg transform hover:scale-105 active:scale-95 
                                         transition-all duration-200 
                                         ${event.completada 
                                           ? 'bg-green-500 text-white hover:bg-green-600' 
                                           : 'bg-white/50 dark:bg-black/20 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-black/40'}`}
                              title={event.completada ? "Marcar como pendiente" : "Marcar como completada"}
                            >
                              {event.completada ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                              <span className="text-sm">{event.completada ? 'Hecho' : 'Hacer'}</span>
                            </button>

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
                            </>
                           ) : (
                             <div className="flex items-center justify-center p-2 bg-muted/50 rounded-lg border border-border" title="Evento histórico no editable">
                               <Lock className="h-5 w-5 text-muted-foreground" />
                             </div>
                           )}
                        </div>
                      </div>

                       {/* Metadatos */}
                       <div className="border-t border-white/30 dark:border-black/20 pt-3 mt-4">
                         <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
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

      {/* Modal de confirmación de eliminación */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-red-500">
                  <AlertTriangle className="h-6 w-6" />
                  <h3 className="text-xl font-bold">Confirmar eliminación</h3>
                </div>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-foreground mb-2">
                  ¿Estás seguro de que quieres eliminar el evento:
                </p>
                <div className="bg-muted/50 p-3 rounded-lg border border-border mb-4">
                  <p className="font-bold text-foreground">{eventToDeleteData?.orquesta}</p>
                  <p className="text-sm text-muted-foreground">
                    {eventToDeleteData?.eventData.day && new Date(eventToDeleteData.eventData.day).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </p>
                </div>

                <label className="block text-sm font-medium text-foreground mb-2">
                  Motivo de la eliminación (opcional)
                </label>
                <select
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                >
                  <option value="">Sin especificar</option>
                  <option value="Climatológica">1º Climatológica</option>
                  <option value="Defunción">2º Defunción</option>
                  <option value="Otro motivo">3º Otro motivo</option>
                </select>
                {deletionReason === 'Otro motivo' && (
                  <input
                    type="text"
                    value={customDeletionReason}
                    onChange={(e) => setCustomDeletionReason(e.target.value)}
                    placeholder="Especifica el motivo"
                    className="w-full mt-2 bg-background border border-input rounded-xl px-4 py-2.5 text-foreground focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  />
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-foreground font-medium hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Eliminar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}