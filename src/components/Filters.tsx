import { useState, useEffect, useRef } from 'react';
import { Event } from '../types/event';
import { normalizeString } from '../lib/utils';
import { 
  Filter, 
  Search, 
  Calendar, 
  MapPin, 
  Music, 
  Clock,
  RefreshCw,
  X
} from 'lucide-react';

interface FiltersProps {
  events: Event[];
  onFilterChange: (filtered: Event[]) => void;
}

export default function Filters({ events, onFilterChange }: FiltersProps) {
  const [filterSelect, setFilterSelect] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateRange, setShowDateRange] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Estados para autocompletado
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Generar sugerencias para autocompletado
  useEffect(() => {
    if (!showSearch || !filterSelect) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    let uniqueSuggestions: string[] = [];

    if (filterSelect === 'orquesta') {
      const allOrquestas = events.flatMap(e =>
        e.orquesta.split(',').map(o => o.trim())
      );
      uniqueSuggestions = [...new Set(allOrquestas)].sort();
    } else if (filterSelect === 'lugar') {
      const allLugares = events
        .filter(e => e.lugar && e.lugar.trim())
        .map(e => e.lugar.trim());
      uniqueSuggestions = [...new Set(allLugares)].sort();
    } else if (filterSelect === 'municipio') {
      const allMunicipios = events
        .filter(e => e.municipio && e.municipio.trim())
        .map(e => e.municipio.trim());
      uniqueSuggestions = [...new Set(allMunicipios)].sort();
    }

    setSuggestions(uniqueSuggestions);
  }, [events, filterSelect, showSearch]);

  const handleFilterSelectChange = (value: string) => {
    setFilterSelect(value);
    setSearchInput('');
    setShowSuggestions(false);

    if (value === 'intervaloFechas') {
      setShowDateRange(true);
      setShowSearch(false);
    } else if (
      value === 'ultimoMesYMedio' ||
      value === 'todos' ||
      value === ''
    ) {
      setShowDateRange(false);
      setShowSearch(false);
    } else {
      setShowDateRange(false);
      setShowSearch(true);
    }
  };

  // Funciones para autocompletado
  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    
    if (!filterSelect || !value.trim()) {
      setShowSuggestions(false);
      return;
    }

    const filteredSuggestions = suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(value.toLowerCase())
    );
    setShowSuggestions(filteredSuggestions.length > 0 && filteredSuggestions[0] !== value);
  };

  const selectSuggestion = (suggestion: string) => {
    setSearchInput(suggestion);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleFilter = () => {
    if (filterSelect === '') {
      // Volver al filtro inicial de 2 días
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const filtered = events.filter(event => {
        const eventDate = new Date(event.day);
        return eventDate >= twoDaysAgo;
      });
      onFilterChange(filtered);
      return;
    }

    if (filterSelect === 'todos') {
      onFilterChange(events);
      return;
    }

    if (filterSelect === 'ultimoMesYMedio') {
      const oneAndHalfMonthsAgo = new Date();
      oneAndHalfMonthsAgo.setMonth(oneAndHalfMonthsAgo.getMonth() - 1.5);
      const filtered = events.filter(
        event => new Date(event.day) >= oneAndHalfMonthsAgo
      );
      onFilterChange(filtered);
      return;
    }

    if (filterSelect === 'intervaloFechas' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const filtered = events.filter(event => {
        const eventDate = new Date(event.day);
        return eventDate >= start && eventDate <= end;
      });
      onFilterChange(filtered);
      return;
    }

    if (filterSelect && searchInput) {
      const filtered = events.filter(event => {
        const fieldValue = (event as any)[filterSelect];
        return fieldValue && fieldValue.toLowerCase().includes(searchInput.toLowerCase());
      });
      onFilterChange(filtered);
    }
  };

  const clearFilters = () => {
    setFilterSelect('');
    setSearchInput('');
    setStartDate('');
    setEndDate('');
    setShowDateRange(false);
    setShowSearch(false);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Aplicar filtro inicial de 2 días
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const filtered = events.filter(event => {
      const eventDate = new Date(event.day);
      return eventDate >= twoDaysAgo;
    });
    onFilterChange(filtered);
  };

  const getFilterIcon = (filterType: string) => {
    switch (filterType) {
      case 'orquesta':
        return <Music className="h-4 w-4" />;
      case 'municipio':
        return <MapPin className="h-4 w-4" />;
      case 'lugar':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Filter className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
          <div className="flex items-center justify-center space-x-2">
            <Filter className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white">Filtros de Eventos</h2>
          </div>
          <p className="text-center text-white/80 text-sm mt-2">
            Personaliza tu vista de eventos
          </p>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Barra de búsqueda con autocompletado */}
          {showSearch && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={`Buscar por ${filterSelect}...`}
                value={searchInput}
                onChange={e => handleSearchInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl
                           focus:border-indigo-500 focus:outline-none transition-all duration-300
                           bg-white text-gray-900 placeholder-gray-500"
              />
              
              {/* Sugerencias de autocompletado */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {suggestions
                    .filter(suggestion => 
                      suggestion.toLowerCase().includes(searchInput.toLowerCase()) &&
                      suggestion !== searchInput
                    )
                    .slice(0, 8)
                    .map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectSuggestion(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 
                                 border-gray-100 transition-colors duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selector de filtro */}
          <div className="relative">
            <select
              value={filterSelect}
              onChange={e => handleFilterSelectChange(e.target.value)}
              className="w-full px-4 py-3 pl-11 border-2 border-gray-200 rounded-xl 
                         focus:border-indigo-500 focus:outline-none transition-all duration-300
                         bg-white text-gray-900 appearance-none cursor-pointer"
            >
              <option value="">Filtrar por/Quitar Filtro</option>
              <option value="orquesta">🎵 Orquesta</option>
              <option value="municipio">📍 Municipio</option>
              <option value="lugar">🏢 Lugar</option>
              <option value="todos">📋 Mostrar todos los eventos</option>
              <option value="ultimoMesYMedio">⏰ Mostrar últimos 45 días</option>
              <option value="intervaloFechas">📅 Intervalo de fechas</option>
            </select>
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {getFilterIcon(filterSelect)}
            </div>
            {/* Flecha personalizada */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Rango de fechas */}
          {showDateRange && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <h4 className="font-semibold text-gray-800 flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Seleccionar intervalo de fechas</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl
                               focus:border-indigo-500 focus:outline-none transition-all duration-300
                               bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de fin
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl
                               focus:border-indigo-500 focus:outline-none transition-all duration-300
                               bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleFilter}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600
                         hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-6 
                         rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 
                         transition-all duration-300 flex-1"
            >
              <Filter className="h-5 w-5" />
              <span>Aplicar Filtro</span>
            </button>

            <button
              onClick={clearFilters}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-gray-500 to-gray-600
                         hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 
                         rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 
                         transition-all duration-300"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Limpiar</span>
            </button>
          </div>

          {/* Indicadores activos */}
          {(filterSelect || searchInput || startDate || endDate) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-800">
                    Filtros activos
                  </span>
                </div>
                <button
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="mt-2 flex flex-wrap gap-2">
                {filterSelect && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-lg">
                    Tipo: {filterSelect}
                  </span>
                )}
                {searchInput && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-lg">
                    Búsqueda: "{searchInput}"
                  </span>
                )}
                {startDate && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-lg">
                    Desde: {startDate}
                  </span>
                )}
                {endDate && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-lg">
                    Hasta: {endDate}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}