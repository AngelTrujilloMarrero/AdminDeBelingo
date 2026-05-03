import { useState, useEffect, useRef } from 'react';
import { Event } from '../types/event';
import { Search, X } from 'lucide-react';

interface QuickSearchProps {
  events: Event[];
  onFilterChange: (filtered: Event[]) => void;
}

export default function QuickSearch({ events, onFilterChange }: QuickSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Event[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const normalizedQuery = query.toLowerCase().trim();
      
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);

      const filtered = events
        .filter(event => {
          const eventDate = new Date(event.day);
          return eventDate >= twoDaysAgo;
        })
        .filter(event => {
          const searchText = `${event.orquesta} ${event.municipio} ${event.lugar} ${event.tipo} ${event.day} ${event.hora}`.toLowerCase();
          return searchText.includes(normalizedQuery);
        })
        .slice(0, 10);

      setResults(filtered);
      setShowResults(true);
    }, 300);

return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, [query, events]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleSelectResult = (event: Event) => {
    const eventDate = new Date(event.day);
    const monthKey = `${eventDate.getFullYear()}-${(eventDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const filtered = events.filter(e => {
      const eDate = new Date(e.day);
      const eMonthKey = `${eDate.getFullYear()}-${(eDate.getMonth() + 1).toString().padStart(2, '0')}`;
      return eMonthKey === monthKey;
    });
    
    onFilterChange(filtered);
    setShowResults(false);
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
                  {event.day} · {event.municipio} · {event.hora}
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
    </div>
  );
}