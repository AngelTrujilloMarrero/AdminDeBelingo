import { useState, useEffect, useRef } from 'react';
import { ref, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event, MUNICIPIOS, TIPOS_EVENTO } from '../types/event';
import {
  normalizeString,
  levenshteinDistance,
  generateTimeOptions,
  estandarizarNombre
} from '../lib/utils';
import { 
  Calendar, 
  Music, 
  MapPin, 
  Clock, 
  Tag, 
  Save, 
  X, 
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface EventFormProps {
  events: Event[];
  editingEvent: Event | null;
  onEventAdded: () => void;
  onCancelEdit: () => void;
}

interface FloatingLabelInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: React.ReactNode;
  className?: string;
  placeholder?: string;
  suggestions?: string[] | Array<{ lugar: string; municipio: string }>;
  onSuggestionClick?: (value: any) => void;
  showSuggestions?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

function FloatingLabelInput({
  id,
  label,
  value,
  onChange,
  type = 'text',
  icon,
  className = '',
  placeholder = '',
  suggestions = [],
  onSuggestionClick,
  showSuggestions = false,
  inputRef
}: FloatingLabelInputProps) {
  const hasValue = value.length > 0;
  const isDateInput = type === 'date';

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          className={`
            w-full px-4 ${isDateInput ? 'pt-6 pb-2' : 'py-4'} ${icon ? 'pl-11' : 'pl-4'} border-2 border-gray-200 rounded-xl
            focus:border-indigo-500 focus:outline-none transition-all duration-300
            bg-white text-gray-900 peer placeholder-transparent
          `}
        />
        <label
          htmlFor={id}
          className={`
            absolute ${icon ? 'left-11' : 'left-4'} transition-all duration-300 pointer-events-none
            text-gray-500 origin-left
            ${isDateInput 
              ? 'top-2 text-xs font-medium text-indigo-600 scale-90' 
              : `peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base
                 peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-indigo-600 peer-focus:scale-90
                 ${hasValue ? 'top-2 text-xs font-medium text-indigo-600 scale-90' : 'top-1/2 -translate-y-1/2 text-base'}`
            }
          `}
        >
          {label}
        </label>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSuggestionClick?.(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 
                         border-gray-100 transition-colors duration-200"
            >
              {typeof suggestion === 'string' ? (
                suggestion
              ) : (
                <div>
                  <span className="font-medium">{suggestion.lugar}</span>
                  <span className="text-gray-500 ml-2">({suggestion.municipio})</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventForm({
  events,
  editingEvent,
  onEventAdded,
  onCancelEdit
}: EventFormProps) {
  const [formData, setFormData] = useState({
    eventDate: '',
    orquesta: '',
    lugar: '',
    municipio: '',
    hora: '',
    tipo: 'Baile Normal',
    customTipo: ''
  });

  const [showCustomTipo, setShowCustomTipo] = useState(false);
  const [missingFields, setMissingFields] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Autocompletado
  const [orquestaSuggestions, setOrquestaSuggestions] = useState<string[]>([]);
  const [showOrquestaSuggestions, setShowOrquestaSuggestions] = useState(false);
  const [lugarSuggestions, setLugarSuggestions] = useState<Array<{ lugar: string; municipio: string }>>([]);
  const [showLugarSuggestions, setShowLugarSuggestions] = useState(false);

  const orquestaInputRef = useRef<HTMLInputElement>(null);
  const lugarInputRef = useRef<HTMLInputElement>(null);

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    if (editingEvent) {
      const tipoOptions = TIPOS_EVENTO;
      const isCustomTipo = !tipoOptions.includes(editingEvent.tipo);

      setFormData({
        eventDate: editingEvent.day,
        orquesta: editingEvent.orquesta,
        lugar: editingEvent.lugar,
        municipio: editingEvent.municipio,
        hora: editingEvent.hora,
        tipo: isCustomTipo ? 'Otro' : editingEvent.tipo,
        customTipo: isCustomTipo ? editingEvent.tipo : ''
      });
      setShowCustomTipo(isCustomTipo);
    }
  }, [editingEvent]);

  // Escuchar selección de fecha desde el calendario
  useEffect(() => {
    const handleDateSelected = (event: CustomEvent) => {
      setFormData(prev => ({ ...prev, eventDate: event.detail }));
    };

    window.addEventListener('dateSelected', handleDateSelected as EventListener);
    return () => {
      window.removeEventListener('dateSelected', handleDateSelected as EventListener);
    };
  }, []);

  useEffect(() => {
    const allOrquestas = events.flatMap(e =>
      e.orquesta.split(',').map(o => o.trim())
    );
    const uniqueOrquestas = [...new Set(allOrquestas)].sort();
    setOrquestaSuggestions(uniqueOrquestas);

    const lugares = events
      .filter(e => e.lugar && e.municipio)
      .map(e => ({
        lugar: e.lugar.trim(),
        municipio: e.municipio.trim()
      }));

    const uniquePairs: Array<{ lugar: string; municipio: string }> = [];
    const seen = new Set<string>();

    lugares.forEach(({ lugar, municipio }) => {
      const key = `${lugar.toLowerCase()}|${municipio.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePairs.push({ lugar, municipio });
      }
    });

    setLugarSuggestions(uniquePairs);
  }, [events]);

  const handleOrquestaInput = (value: string) => {
    setFormData({ ...formData, orquesta: value });
    const parts = value.split(',');
    const lastPart = parts[parts.length - 1].trim().toLowerCase();

    if (lastPart) {
      const filtered = orquestaSuggestions.filter(orq =>
        orq.toLowerCase().startsWith(lastPart)
      );
      setShowOrquestaSuggestions(filtered.length > 0);
    } else {
      setShowOrquestaSuggestions(false);
    }
  };

  const handleLugarInput = (value: string) => {
    setFormData({ ...formData, lugar: value });
    const val = value.toLowerCase();

    if (val) {
      const filtered = lugarSuggestions.filter(({ lugar, municipio }) =>
        `${lugar} (${municipio})`.toLowerCase().includes(val)
      );
      setShowLugarSuggestions(filtered.length > 0);
    } else {
      setShowLugarSuggestions(false);
    }
  };

  const selectOrquesta = (orq: string) => {
    const parts = formData.orquesta.split(',');
    parts[parts.length - 1] = orq;
    setFormData({ ...formData, orquesta: parts.map(p => p.trim()).join(', ') + ', ' });
    setShowOrquestaSuggestions(false);
    orquestaInputRef.current?.focus();
  };

  const selectLugar = (item: { lugar: string; municipio: string }) => {
    setFormData({ ...formData, lugar: item.lugar, municipio: item.municipio });
    setShowLugarSuggestions(false);
    lugarInputRef.current?.focus();
  };

  const validateAndSave = async () => {
    const { eventDate, orquesta, municipio, hora, tipo, customTipo } = formData;

    const missing: string[] = [];
    if (!eventDate) missing.push('Fecha');
    if (!orquesta) missing.push('Orquesta/Grupo');
    if (!municipio) missing.push('Municipio');
    if (!hora) missing.push('Hora de comienzo');
    if (!tipo && !customTipo) missing.push('Tipo de evento');
    if (tipo === 'Otro' && !customTipo) missing.push('Especificación del tipo');

    if (missing.length > 0) {
      setMissingFields(`Faltan los siguientes campos: ${missing.join(', ')}`);
      return;
    }

    setMissingFields('');
    setDuplicateWarning('');
    setConflictWarnings([]);

    const orquestas = orquesta
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);

    const invalidOrquestas = orquestas.filter(
      o => o.charAt(0) !== o.charAt(0).toUpperCase()
    );
    if (invalidOrquestas.length > 0) {
      alert('La primera letra de cada grupo/orquesta debe ser en mayúscula.');
      return;
    }

    const existingOrquestas = events
      .filter(e => !editingEvent || e.id !== editingEvent.id)
      .flatMap(e => e.orquesta.split(',').map(o => o.trim()));

    const warnings: string[] = [];

    // Detectar orquestas conflictivas (escritura diferente)
    const conflictivas = orquestas.filter(orq => {
      // EXCEPCIÓN: Si la orquesta es DJ (en cualquier variación), omitir validación de escritura
      const isDJ = normalizeString(orq).includes('dj');
      if (isDJ) return false;

      const normalized = normalizeString(orq);
      return (
        existingOrquestas.some(e => normalizeString(e) === normalized) &&
        !existingOrquestas.includes(orq)
      );
    });

    if (conflictivas.length > 0) {
      warnings.push(
        `La orquesta "${conflictivas.join(', ')}" ya existe escrita de forma diferente. Revisa antes de continuar.`
      );
    }

    // Detectar similitudes (1 letra diferente)
    const similarBy1 = orquestas.filter(orq => {
      // EXCEPCIÓN: Si la orquesta es DJ (en cualquier variación), omitir validación de similitudes
      const isDJ = normalizeString(orq).includes('dj');
      if (isDJ) return false;

      const estandarizada = estandarizarNombre(orq);
      if (existingOrquestas.includes(estandarizada)) return false;

      const normalized = normalizeString(orq);
      return existingOrquestas.some(
        existing => levenshteinDistance(normalizeString(existing), normalized) === 1
      );
    });

    if (similarBy1.length > 0) {
      warnings.push(
        `El nombre de orquesta "${similarBy1.join(', ')}" es muy similar a uno ya existente (1 letra diferente).`
      );
    }

    // Detectar conflictos de horario con misma orquesta (CORRECCION MEJORADA)
    // Verificar para cada orquesta del nuevo evento
    const conflictosDetallados: string[] = [];
    const conflictosCriticos: string[] = [];
    
    orquestas.forEach(orquestaActual => {
      // EXCEPCIÓN: Si la orquesta es DJ (en cualquier variación), omitir validación de duplicados
      const isDJ = normalizeString(orquestaActual).includes('dj');
      if (isDJ) {
        return; // Saltar validación para DJs
      }
      
      // Buscar eventos que contengan esta orquesta específica
      const eventosConEstaOrquesta = events.filter(event => {
        if (editingEvent && event.id === editingEvent.id) return false;
        
        // Obtener todas las orquestas de este evento
        const orquestasDelEvento = event.orquesta.split(',').map(o => o.trim());
        
        // Verificar si alguna orquesta del evento coincide con la orquesta actual
        return orquestasDelEvento.some(orqExistente => 
          normalizeString(orqExistente) === normalizeString(orquestaActual.trim())
        );
      });
      
      // De esos eventos, filtrar los de la misma fecha
      const eventosMismaFecha = eventosConEstaOrquesta.filter(e => e.day === eventDate);
      
      // De esos, buscar conflictos de horario (diferencia <= 2 horas)
      eventosMismaFecha.forEach(eventoExistente => {
        const h1 = new Date(`1970-01-01T${eventoExistente.hora}:00`).getTime();
        const h2 = new Date(`1970-01-01T${hora}:00`).getTime();
        const diferenciaHoras = Math.abs(h1 - h2) / (1000 * 60 * 60);
        
        if (diferenciaHoras <= 2) {
          const mensaje = `ADVERTENCIA: La orquesta "${orquestaActual.trim()}" ya tiene una actuacion el ${eventoExistente.day} a las ${eventoExistente.hora} en ${eventoExistente.lugar || 'casco'} (${eventoExistente.municipio}). Diferencia de tiempo: ${diferenciaHoras.toFixed(1)} horas.`;
          conflictosDetallados.push(mensaje);
          conflictosCriticos.push(`La orquesta "${orquestaActual.trim()}" ya toca el ${eventoExistente.day} a las ${eventoExistente.hora}`);
        }
      });
    });
    
    // ALERT CRÍTICO para eventos duplicados de orquesta
    if (conflictosCriticos.length > 0) {
      const alertMessage = `⚠️ CONFLICTO DETECTADO:\n\n${conflictosCriticos.join('\n')}\n\n¿Deseas continuar con el guardado?`;
      const confirmResult = window.confirm(alertMessage);
      if (!confirmResult) {
        return; // No guardar si el usuario cancela
      }
    }
    
    if (conflictosDetallados.length > 0) {
      conflictosDetallados.forEach(conflicto => warnings.push(conflicto));
    }

    // Detectar conflictos de lugar
    const conflictoLugar = events.find(
      ev =>
        (!editingEvent || ev.id !== editingEvent.id) &&
        ev.day === eventDate &&
        normalizeString(ev.municipio) === normalizeString(municipio) &&
        normalizeString(ev.lugar) === normalizeString(formData.lugar) &&
        Math.abs(
          new Date(`1970-01-01T${ev.hora}:00`).getTime() -
          new Date(`1970-01-01T${hora}:00`).getTime()
        ) <= 60 * 60 * 1000
    );

    if (conflictoLugar) {
      warnings.push(
        `Ya existe un evento el ${conflictoLugar.day} en ${conflictoLugar.lugar || 'casco'} (${conflictoLugar.municipio}) alrededor de la hora ${conflictoLugar.hora}, con otra orquesta.`
      );
    }

    // Mostrar advertencias pero permitir guardar
    if (warnings.length > 0) {
      setConflictWarnings(warnings);
    }

    await saveEvent();
  };

  const saveEvent = async () => {
    setIsLoading(true);
    const { eventDate, orquesta, lugar, municipio, hora, tipo, customTipo } = formData;

    const orquestas = orquesta
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);

    const event = {
      orquesta: orquestas.map(estandarizarNombre).join(', '),
      municipio,
      lugar,
      hora,
      day: eventDate,
      tipo: tipo === 'Otro' ? customTipo : tipo,
      editing: false,
      cancelado: false,
      FechaAgregado: editingEvent?.FechaAgregado || new Date().toISOString(),
      FechaEditado: new Date().toISOString()
    };

    try {
      if (editingEvent) {
        const eventRef = ref(db, `events/${editingEvent.id}`);
        await set(eventRef, event);
      } else {
        const eventsRef = ref(db, 'events');
        await push(eventsRef, event);
      }

      clearForm();
      onEventAdded();
      setSuccessMessage('Evento guardado con éxito');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error al guardar evento:', error);
      alert('Error al guardar el evento');
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      eventDate: '',
      orquesta: '',
      lugar: '',
      municipio: '',
      hora: '',
      tipo: 'Baile Normal',
      customTipo: ''
    });
    setShowCustomTipo(false);
    setMissingFields('');
    setDuplicateWarning('');
    setConflictWarnings([]);
  };

  const handleCancel = () => {
    clearForm();
    onCancelEdit();
  };

  return (
    <div className="max-w-4xl mx-auto p-6" id="form-container">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            {editingEvent ? (
              <>
                <Eye className="h-6 w-6" />
                <span>Editar Evento</span>
              </>
            ) : (
              <>
                <Save className="h-6 w-6" />
                <span>Agregar Nuevo Evento</span>
              </>
            )}
          </h2>
          <p className="text-white/80 mt-2">
            {editingEvent 
              ? 'Modifica los datos del evento existente'
              : 'Completa los datos para crear un nuevo evento'
            }
          </p>
        </div>

        {/* Formulario */}
        <div className="p-6 space-y-6">
          {/* Fecha */}
          <FloatingLabelInput
            id="eventDate"
            label="Fecha del evento"
            value={formData.eventDate}
            onChange={(value) => setFormData({ ...formData, eventDate: value })}
            type="date"
            icon={<Calendar className="h-5 w-5" />}
          />

          {/* Orquesta con autocompletado */}
          <FloatingLabelInput
            id="orquesta"
            label="Orquesta/Grupo"
            value={formData.orquesta}
            onChange={handleOrquestaInput}
            icon={<Music className="h-5 w-5" />}
            placeholder="Si hay varios sepáralos por comas"
            suggestions={orquestaSuggestions.filter(orq => {
              const parts = formData.orquesta.split(',');
              const lastPart = parts[parts.length - 1].trim().toLowerCase();
              return orq.toLowerCase().startsWith(lastPart);
            })}
            showSuggestions={showOrquestaSuggestions}
            onSuggestionClick={selectOrquesta}
            inputRef={orquestaInputRef}
          />

          {/* Lugar con autocompletado */}
          <FloatingLabelInput
            id="lugar"
            label="Sitio/Lugar"
            value={formData.lugar}
            onChange={handleLugarInput}
            icon={<MapPin className="h-5 w-5" />}
            placeholder="Déjalo en blanco si es el sitio habitual o casco"
            suggestions={lugarSuggestions.filter(({ lugar, municipio }) =>
              `${lugar} (${municipio})`.toLowerCase().includes(formData.lugar.toLowerCase())
            )}
            showSuggestions={showLugarSuggestions}
            onSuggestionClick={selectLugar}
            inputRef={lugarInputRef}
          />

          {/* Grid de municipio y hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Municipio */}
            <div className="relative">
              <select
                value={formData.municipio}
                onChange={e => setFormData({ ...formData, municipio: e.target.value })}
                className="w-full px-4 py-4 pl-11 border-2 border-gray-200 rounded-xl 
                           focus:border-indigo-500 focus:outline-none transition-all duration-300
                           bg-white text-gray-900 appearance-none"
              >
                <option value="">Selecciona un municipio</option>
                {MUNICIPIOS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <MapPin className="h-5 w-5" />
              </div>
              <label className="absolute left-11 top-2 text-xs font-medium text-indigo-600">
                Municipio
              </label>
            </div>

            {/* Hora */}
            <div className="relative">
              <select
                value={formData.hora}
                onChange={e => setFormData({ ...formData, hora: e.target.value })}
                className="w-full px-4 py-4 pl-11 border-2 border-gray-200 rounded-xl 
                           focus:border-indigo-500 focus:outline-none transition-all duration-300
                           bg-white text-gray-900 appearance-none"
              >
                <option value="">Seleccione la hora</option>
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Clock className="h-5 w-5" />
              </div>
              <label className="absolute left-11 top-2 text-xs font-medium text-indigo-600">
                Hora de comienzo
              </label>
            </div>
          </div>

          {/* Tipo */}
          <div className="relative">
            <select
              value={formData.tipo}
              onChange={e => {
                setFormData({ ...formData, tipo: e.target.value });
                setShowCustomTipo(e.target.value === 'Otro');
              }}
              className="w-full px-4 py-4 pl-11 border-2 border-gray-200 rounded-xl 
                         focus:border-indigo-500 focus:outline-none transition-all duration-300
                         bg-white text-gray-900 appearance-none"
            >
              {TIPOS_EVENTO.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Tag className="h-5 w-5" />
            </div>
            <label className="absolute left-11 top-2 text-xs font-medium text-indigo-600">
              Tipo de evento
            </label>
          </div>

          {/* Tipo personalizado */}
          {showCustomTipo && (
            <FloatingLabelInput
              id="customTipo"
              label="Especifica el tipo"
              value={formData.customTipo}
              onChange={(value) => setFormData({ ...formData, customTipo: value })}
              icon={<Tag className="h-5 w-5" />}
            />
          )}

          {/* Mensajes */}
          {missingFields && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 font-medium">{missingFields}</p>
            </div>
          )}

          {duplicateWarning && (
            <div className="flex items-center space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
              <p className="text-yellow-700 font-medium">{duplicateWarning}</p>
            </div>
          )}

          {conflictWarnings.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <p className="text-yellow-800 font-semibold">Advertencias detectadas:</p>
              </div>
              <ul className="ml-7 space-y-1">
                {conflictWarnings.map((warning, idx) => (
                  <li key={idx} className="text-yellow-700 text-sm">
                    {warning}
                  </li>
                ))}
              </ul>
              <p className="text-yellow-700 text-xs mt-2 ml-7">
                El evento se guardara de todos modos. Verifica que la informacion sea correcta.
              </p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <p className="text-green-700 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            {!editingEvent ? (
              <button
                onClick={validateAndSave}
                disabled={isLoading}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600
                           hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 px-6 
                           rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 
                           transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed 
                           disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Agregar Evento</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={validateAndSave}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600
                             hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 px-6 
                             rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 
                             transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed 
                             disabled:transform-none"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Actualizar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-gray-500 to-gray-600
                             hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-4 px-6 
                             rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 
                             transition-all duration-300"
                >
                  <X className="h-5 w-5" />
                  <span>Cancelar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}