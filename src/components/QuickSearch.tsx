import { useState, useEffect, useRef } from 'react';
import { Event } from '../types/event';
import { Search, X, Edit, Trash2 } from 'lucide-react';
import { useEventActions } from '../hooks/useEventActions';

interface QuickSearchProps {
  events: Event[];
  onEditEvent: (event: Event) => void;
}

export default function QuickSearch({ events, onEditEvent }: QuickSearchProps) {
  const { checkIfEventAlreadyDeleted, deleteEvent, checkIfArchived } = useEventActions();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Event[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState<string>('');
  const [customDeletionReason, setCustomDeletionReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim() || selectedEvent) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);

      const recentEvents = events.filter(event => {
        const eventDate = new Date(event.day);
        return eventDate >= twoDaysAgo;
      });

      const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);

      if (searchTerms.length === 0) {
        setResults([]);
        setShowResults(false);
        return;
      }

      const searchInField = (field: string, term: string): boolean => {
        if (!field) return false;
        return field.toLowerCase().includes(term);
      };

      const scoredEvents = recentEvents.map(event => {
        let score = 0;
        const fields = [
          event.orquesta,
          event.municipio,
          event.lugar,
          event.tipo,
          event.day,
          event.hora
        ];

        for (const term of searchTerms) {
          for (const field of fields) {
            if (searchInField(field, term)) {
              score += 1;
              if (field.toLowerCase() === term) {
                score += 2;
              }
              if (field.toLowerCase().startsWith(term)) {
                score += 1;
              }
            }
          }
        }

        return { event, score };
      });

      const results = scoredEvents
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.event)
        .slice(0, 10);

      setResults(results);
      setShowResults(true);
    }, 300);

    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, [query, events, selectedEvent]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedEvent(null);
    inputRef.current?.focus();
  };

  const handleSelectResult = (event: Event) => {
    setSelectedEvent(event);
    setShowResults(false);
  };

  const handleEdit = () => {
    if (selectedEvent) {
      onEditEvent(selectedEvent);
      setSelectedEvent(null);
      setQuery('');
    }
  };

  const handleDeleteClick = () => {
    if (!selectedEvent) return;

    if (checkIfArchived(selectedEvent)) {
      alert(`El evento "${selectedEvent.orquesta}" es de un año anterior y está archivado.\nNo se puede eliminar directamente.`);
      setSelectedEvent(null);
      return;
    }

    setIsDeleteModalOpen(true);
    setDeletionReason('');
    setCustomDeletionReason('');
  };

  const confirmDelete = async () => {
    if (!selectedEvent) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteEvent(selectedEvent.id, selectedEvent, deletionReason, customDeletionReason);
      
      if (success) {
        setIsDeleteModalOpen(false);
        setSelectedEvent(null);
        setQuery('');
      } else {
        alert('Error al eliminar el evento');
      }
    } catch (error) {
      console.error('Error al eliminar evento:', error);
      alert('Error al eliminar el evento');
    } finally {
      setIsDeleting(false);
    }
  };



  

  return (
    <div className="md:hidden mb-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar evento..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-card border-2 border-border rounded-xl
                     focus:border-indigo-500 focus:outline-none transition-all
                     text-foreground placeholder-muted-foreground"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-3 flex items-center"
          >
            <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {selectedEvent ? (
        <div className="mt-2 bg-card border-2 border-border rounded-xl p-4 shadow-lg">
          <div className="mb-4">
            <div className="font-medium text-foreground">{selectedEvent.orquesta}</div>
            <div className="text-xs text-muted-foreground">
              {selectedEvent.day} · {selectedEvent.lugar ? `${selectedEvent.lugar}, ` : ''}{selectedEvent.municipio} · {selectedEvent.hora}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium"
            >
              <Edit className="h-4 w-4" />
              Editar
            </button>

            <button
              onClick={handleDeleteClick}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
            <button
              onClick={handleClear}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-500 hover:bg-slate-600 text-white py-2 px-3 rounded-lg text-sm font-medium"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
          </div>
          
        </div>
      ) : (
        <>
          {showResults && results.length > 0 && (
            <div className="mt-2 bg-card border-2 border-border rounded-xl overflow-hidden shadow-lg">
              <div className="p-2 text-xs text-muted-foreground border-b border-border">
                {results.length} resultado{results.length > 1 ? 's' : ''}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {results.map(event => (
                  <button
                    key={event.id}
                    onClick={() => handleSelectResult(event)}
                    className="w-full px-4 py-3 text-left hover:bg-muted border-b border-border last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-foreground text-sm">{event.orquesta}</div>
                    <div className="text-xs text-muted-foreground">
                      {event.day} · {event.lugar ? `${event.lugar}, ` : ''}{event.municipio} · {event.hora}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showResults && query && results.length === 0 && (
            <div className="mt-2 p-4 bg-card border-2 border-border rounded-xl text-center text-muted-foreground text-sm">
              No se encontraron eventos
            </div>
          )}
        </>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-red-500">
                  <Trash2 className="h-6 w-6" />
                  <h3 className="text-xl font-bold">Confirmar eliminación</h3>
                </div>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-foreground mb-2">
                  ¿Eliminar evento?
                </p>
                <div className="bg-muted/50 p-3 rounded-lg border border-border mb-4">
                  <p className="font-bold text-foreground">{selectedEvent?.orquesta}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent?.day} · {selectedEvent?.municipio}
                  </p>
                </div>

                <label className="block text-sm font-medium text-foreground mb-2">
                  Motivo (opcional)
                </label>
                <select
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground focus:ring-2 focus:ring-indigo-500 outline-none"
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
                    className="w-full mt-2 bg-background border border-input rounded-xl px-4 py-2.5 text-foreground focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-foreground font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 flex items-center justify-center disabled:opacity-50"
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}