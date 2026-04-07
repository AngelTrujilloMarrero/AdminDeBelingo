import { useState, useEffect, useRef } from 'react';
import { ref, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event, MUNICIPIOS, TIPOS_EVENTO } from '../types/event';

const EMPTY_ORCHESTRA_NAMES: string[] = [];

import {
  normalizeString,
  levenshteinDistance,
  generateTimeOptions,
  estandarizarNombre
} from '../lib/utils';
import { matchSorter } from 'match-sorter';
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
  Globe,
  Sparkles,
  BrainCircuit
} from 'lucide-react';

interface EventFormProps {
  events: Event[];
  editingEvent: Event | null;
  isRestoredEvent?: boolean;
  onEventAdded: () => void;
  onCancelEdit: () => void;
  allOrchestraNames?: string[];
  allOrchestras?: any[];
  deletionIdToRemove?: string | null;
}

import FloatingLabelInput from './FloatingLabelInput';

export default function EventForm({
  events,
  editingEvent,
  isRestoredEvent,
  onEventAdded,
  onCancelEdit,
  allOrchestraNames = EMPTY_ORCHESTRA_NAMES,
  allOrchestras = [],
  deletionIdToRemove
}: EventFormProps) {
  const [formData, setFormData] = useState({
    eventDate: '',
    orquesta: '',
    lugar: '',
    municipio: '',
    hora: '',
    tipo: 'Baile Normal',
    customTipo: '',
    programa: ''
  });

  const [showCustomTipo, setShowCustomTipo] = useState(false);
  const [missingFields, setMissingFields] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [buttonSuccess, setButtonSuccess] = useState(false);

  // IA Suggestions state
  const [iaSuggestions, setIaSuggestions] = useState<any>(null);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [showIAPanel, setShowIAPanel] = useState(false);

  // Autocompletado
  const [orquestaSuggestions, setOrquestaSuggestions] = useState<string[]>([]);
  const [showOrquestaSuggestions, setShowOrquestaSuggestions] = useState(false);
  const [lugarSuggestions, setLugarSuggestions] = useState<Array<{ lugar: string; municipio: string }>>([]);
  const [showLugarSuggestions, setShowLugarSuggestions] = useState(false);

  // Autocompletado para programas
  const [showProgramaSuggestions, setShowProgramaSuggestions] = useState(false);

  const orquestaInputRef = useRef<HTMLInputElement>(null);
  const lugarInputRef = useRef<HTMLInputElement>(null);
  const programaInputRef = useRef<HTMLInputElement>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const tipoDropdownRef = useRef<HTMLDivElement>(null);

  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [horaInvalida, setHoraInvalida] = useState(false);
  const [showTipoDropdown, setShowTipoDropdown] = useState(false);
  const [showMunicipioDropdown, setShowMunicipioDropdown] = useState(false);
  const [isTypingTime, setIsTypingTime] = useState(false);
  const [municipioSearch, setMunicipioSearch] = useState('');
  const [tipoSearch, setTipoSearch] = useState('');
  const [historicalEvents, setHistoricalEvents] = useState<Array<{ event: Event; score: number; reasons: string[] }>>([]);
  const [currentOrquestaInput, setCurrentOrquestaInput] = useState('');

  const municipioDropdownRef = useRef<HTMLDivElement>(null);
  const municipioInputRef = useRef<HTMLInputElement>(null);

  const timeOptions = generateTimeOptions();

  // Efecto para buscar coincidencias históricas con puntuación
  useEffect(() => {
    const { eventDate, lugar, municipio, orquesta } = formData;
    
    // === EXCEPCIONES DE FECHAS ESPECÍFICAS ===
    // Estas fechas siempre tienen el mismo tipo de evento, independientemente del día de la semana
    // Se evalúan PRIMERO
    const EXCEPCIONES_FECHAS = [
      { mes: 7, dia: 15, municipio: 'Tejina', tipo: 'Pamela' },     // 15 de Agosto - Pamela en Tejina
      { mes: 9, dia: 24, municipio: 'Buenavista', tipo: 'Baile Normal' }, // 24 de Octubre - Baile en Buenavista
    ];

    if (eventDate) {
      const dateObj = new Date(eventDate);
      if (!isNaN(dateObj.getTime())) {
        const currentMonth = dateObj.getMonth();
        const currentDay = dateObj.getDate();
        
        // 1º PRIMERO: Verificar excepciones
        const exc = EXCEPCIONES_FECHAS.find(exc => 
          currentMonth === exc.mes && 
          currentDay === exc.dia &&
          (normalizeString(municipio || '').includes(normalizeString(exc.municipio)) ||
           normalizeString(lugar || '').includes(normalizeString(exc.municipio)))
        );

        if (exc) {
          // Buscar evento histórico para obtener la hora de ese día
          const histEventsForDate = events.filter(e => {
            if (!e.lugar || !e.municipio) return false;
            const eDate = new Date(e.day);
            return eDate.getMonth() === currentMonth && 
                   eDate.getDate() === currentDay &&
                   (normalizeString(e.lugar!).includes(normalizeString(lugar || '')) || 
                    normalizeString(e.municipio!).includes(normalizeString(municipio || '')));
          });
          
          const histEvent = histEventsForDate[0];
          
          setHistoricalEvents([{
            event: {
              id: 'exception',
              orquesta: histEvent?.orquesta || '',
              municipio: municipio,
              lugar: lugar || '',
              hora: histEvent?.hora || '',
              day: eventDate,
              tipo: exc.tipo,
              editing: false,
              cancelado: false,
              FechaAgregado: '',
              FechaEditado: ''
            },
            score: 10,
            reasons: ['FechaEsp']
          }]);
          return;
        }

        // 2º SEGUNDO: Buscar evento histórico para esa fecha (solo si coincide día de semana)
        const allMatchingHistoricalEvents = events.filter(e => {
          if (!e.lugar || !e.municipio) return false;
          const eDate = new Date(e.day);
          return eDate.getMonth() === currentMonth && 
                 eDate.getDate() === currentDay &&
                 (normalizeString(e.lugar!).includes(normalizeString(lugar || '')) || 
                  normalizeString(e.municipio!).includes(normalizeString(municipio || '')));
        });

        // Solo mostrar si coincide el día de semana
        const matchingWithDayOfWeek = allMatchingHistoricalEvents.filter(e => {
          const eDate = new Date(e.day);
          return eDate.getDay() === dateObj.getDay();
        });

        if (matchingWithDayOfWeek.length > 0) {
          const histEvent = matchingWithDayOfWeek[0];
          setHistoricalEvents([{
            event: {
              id: histEvent.id,
              orquesta: histEvent.orquesta,
              municipio: municipio || histEvent.municipio,
              lugar: lugar || histEvent.lugar,
              hora: histEvent.hora,
              day: eventDate,
              tipo: histEvent.tipo,
              editing: false,
              cancelado: false,
              FechaAgregado: '',
              FechaEditado: ''
            },
            score: 5,
            reasons: ['Hist+Día']
          }]);
          return;
        }
        
        // Si no coincide día de semana, NO mostrar nada y pasar al paso 3
      }
    }
    // ===========================================

    // Resto de la lógica solo si hay lugar O municipio
    if (eventDate && (lugar || municipio)) {
      const dateObj = new Date(eventDate);
      if (!isNaN(dateObj.getTime())) {
        const currentMonth = dateObj.getMonth();
        const currentDay = dateObj.getDate();
        const currentDayOfWeek = dateObj.getDay();
        const currentYear = dateObj.getFullYear();
        
        const matchingEvents = events.filter(e => {
          if (!e.lugar && !e.municipio) return false;
          const eDate = new Date(e.day);
          const matchesLugar = lugar && e.lugar && normalizeString(e.lugar!).includes(normalizeString(lugar));
          const matchesMunicipio = municipio && e.municipio && normalizeString(e.municipio!).includes(normalizeString(municipio));
          return eDate.getMonth() === currentMonth && 
                 Math.abs(eDate.getDate() - currentDay) <= 10 && 
                 (matchesLugar || matchesMunicipio);
        });

        // Calcular puntuación para cada evento
        const scoredEvents = matchingEvents.map(e => {
          const eDate = new Date(e.day);
          const eDayOfWeek = eDate.getDay();
          const eYear = eDate.getFullYear();
          let score = 0;
          const reasons: string[] = [];

          // Calcular distancia del día (proinidad al día del mes)
          const dayDistance = Math.abs(eDate.getDate() - currentDay);

          // Criterio 1: Día de semana (+6) - más importante
          if (eDayOfWeek === currentDayOfWeek) {
            score += 6;
            reasons.push('Día');
          }

          // Criterio 2: Misma orquesta (+2)
          const currentOrqs = orquesta.toLowerCase().split(',').map(o => o.trim()).filter(Boolean);
          const eventOrqs = e.orquesta.toLowerCase().split(',').map(o => o.trim()).filter(Boolean);
          const hasMatchingOrq = currentOrqs.some(co => eventOrqs.some(eo => co === eo || eo.includes(co) || co.includes(eo)));
          if (currentOrqs.length > 0 && hasMatchingOrq) {
            score += 2;
            reasons.push('Orq');
          }

          // Criterio 3: Estructura histórica - eventos consecutivos (+1)
          const consecutiveEvents = matchingEvents.filter(me => {
            const meDate = new Date(me.day);
            return Math.abs(meDate.getDate() - eDate.getDate()) <= 3;
          });
          if (consecutiveEvents.length >= 2) {
            score += 1;
            reasons.push('Estruct');
          }

          // Criterio 4: Frecuencia del día de semana (+1)
          const dayFrequency = matchingEvents.filter(me => {
            const meDate = new Date(me.day);
            return meDate.getDay() === currentDayOfWeek;
          }).length;
          if (dayFrequency > 1) {
            score += 1;
            reasons.push('Frec');
          }

          // Criterio 5: Patrón de entrada basado en secuencia de creación (+1 a +3)
          const locationKey = `${normalizeString(lugar)}|${normalizeString(municipio)}`;
          const currentOrqInput = formData.orquesta.trim().toLowerCase();
          
          // Buscar eventos del mismo lugar en los eventos actuales (este año)
          const sameLocationEvents = events.filter(ev => {
            if (!ev.lugar && !ev.municipio) return false;
            return (lugar && ev.lugar && normalizeString(ev.lugar!).includes(normalizeString(lugar))) || 
                   (municipio && ev.municipio && normalizeString(ev.municipio!).includes(normalizeString(municipio)));
          }).sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());

          if (sameLocationEvents.length > 0) {
            const lastEvent = sameLocationEvents[sameLocationEvents.length - 1];
            const lastEventDate = new Date(lastEvent.day);
            const currentEventDate = new Date(eventDate);
            const daysDiff = Math.abs(currentEventDate.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24);

            if (daysDiff <= 3) {
              score += 2;
              reasons.push('Seq');
            } else if (daysDiff <= 7) {
              score += 1;
              reasons.push('Seq-');
            }
          }

          // Añadir bonus por año más reciente
          const yearDiff = currentYear - eYear;
          if (yearDiff <= 1) {
            score += 1;
            reasons.push('Año');
          }

          return { event: e, score, reasons, dayDistance };
        });

        // Ordenar: primero por distancia del día (solo para eventos del mismo día de semana), luego por puntuación
        scoredEvents.sort((a, b) => {
          const aSameDay = a.event.day ? new Date(a.event.day).getDay() : -1;
          const bSameDay = b.event.day ? new Date(b.event.day).getDay() : -1;
          const currentDayOfWeek = new Date(eventDate).getDay();
          
          const aMatchesDay = new Date(a.event.day).getDay() === currentDayOfWeek;
          const bMatchesDay = new Date(b.event.day).getDay() === currentDayOfWeek;
          
          // Si ambos coinciden en día de semana, ordenar por proximidad del día
          if (aMatchesDay && bMatchesDay) {
            const dayDiff = a.dayDistance - b.dayDistance;
            if (dayDiff !== 0) return dayDiff;
          }
          // Si solo uno coincide, ese primero
          if (aMatchesDay && !bMatchesDay) return -1;
          if (!aMatchesDay && bMatchesDay) return 1;
          
          // Ordenar por puntuación
          return b.score - a.score;
        });
        
        setHistoricalEvents(scoredEvents);
      }
    } else {
      setHistoricalEvents([]);
    }
  }, [formData.eventDate, formData.lugar, formData.municipio, formData.orquesta, events]);

  const uniqueProgramas = [...new Set(
    events
      .filter(e => e.programa && e.programa.trim())
      .map(e => e.programa!.trim())
  )].sort();

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
        customTipo: isCustomTipo ? editingEvent.tipo : '',
        programa: editingEvent.programa || ''
      });
      setMunicipioSearch(editingEvent.municipio);
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
    const allOrquestas = [
      ...events.flatMap(e => e.orquesta.split(',').map(o => o.trim())),
      ...allOrchestraNames
    ];
    const uniqueOrquestasList = [...new Set(allOrquestas)].filter(Boolean).sort();
    setOrquestaSuggestions(uniqueOrquestasList);

    const lugares = events
      .filter(e => e.lugar && e.municipio)
      .map(e => ({
        lugar: e.lugar!.trim(),
        municipio: e.municipio!.trim()
      }));

    const uniquePairs: Array<{ lugar: string; municipio: string }> = [];
    const seen = new Set<string>();

    lugares.forEach(({ lugar, municipio }) => {
      const normalize = (s: string) => normalizeString(s.trim()).replace(/[^a-z0-9]/g, '');
      const key = `${normalize(lugar)}|${normalize(municipio)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniquePairs.push({ lugar: lugar.trim(), municipio: municipio.trim() });
      }
    });

    setLugarSuggestions(uniquePairs);
  }, [events]);

  const lugarContainerRef = useRef<HTMLDivElement>(null);
  const orquestaContainerRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setShowTimeDropdown(false);
      }
      if (tipoDropdownRef.current && !tipoDropdownRef.current.contains(event.target as Node)) {
        setShowTipoDropdown(false);
      }
      if (municipioDropdownRef.current && !municipioDropdownRef.current.contains(event.target as Node)) {
        setShowMunicipioDropdown(false);
      }
      if (lugarContainerRef.current && !lugarContainerRef.current.contains(event.target as Node)) {
        setShowLugarSuggestions(false);
      }
      if (orquestaContainerRef.current && !orquestaContainerRef.current.contains(event.target as Node)) {
        setShowOrquestaSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOrquestaInput = (value: string) => {
    setFormData({ ...formData, orquesta: value });
    setShowOrquestaSuggestions(true);
  };

  const handleLugarInput = (value: string) => {
    setFormData({ ...formData, lugar: value });
    setShowLugarSuggestions(true);
  };

  const selectOrquesta = (orq: string) => {
    const parts = formData.orquesta.split(',');
    parts[parts.length - 1] = orq;
    setFormData({ ...formData, orquesta: parts.map(p => p.trim()).join(', ') + ', ' });
  };

  const selectLugar = (item: { lugar: string; municipio: string }) => {
    const newMunicipio = item.municipio.trim();
    const newLugar = item.lugar.trim();
    
    // Cerrar dropdown de lugar primero
    setShowLugarSuggestions(false);
    setShowOrquestaSuggestions(false);
    setShowTimeDropdown(false);
    setShowTipoDropdown(false);
    setShowMunicipioDropdown(false);
    setShowProgramaSuggestions(false);
    
    // Actualizar estado
    setFormData(prev => ({ ...prev, lugar: newLugar, municipio: newMunicipio }));
    setMunicipioSearch(newMunicipio);
  };

  const validateAndSave = async () => {
    const { eventDate, orquesta, municipio, hora, tipo, customTipo, programa } = formData;
    const missing: string[] = [];
    if (!eventDate) missing.push('Fecha');
    if (!orquesta) missing.push('Orquesta/Grupo');
    if (!municipio) missing.push('Municipio');
    if (!hora) missing.push('Hora de comienzo');
    if (hora && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) missing.push('Hora (formato inválido, use HH:MM)');
    if (!tipo && !customTipo) missing.push('Tipo de evento');
    if (tipo === 'Otro' && !customTipo) missing.push('Especificación del tipo');

    if (missing.length > 0) {
      setMissingFields(`Faltan los siguientes campos: ${missing.join(', ')}`);
      return;
    }

    setMissingFields('');
    setDuplicateWarning('');
    setConflictWarnings([]);

    const orquestasList = orquesta.split(',').map(o => o.trim()).filter(o => o.length > 0);
    const invalidOrquestas = orquestasList.filter(o => o.charAt(0) !== o.charAt(0).toUpperCase());
    if (invalidOrquestas.length > 0) {
      alert('La primera letra de cada grupo/orquesta debe ser en mayúscula.');
      return;
    }

    await saveEvent();
  };

  const saveEvent = async () => {
    setIsLoading(true);
    const { eventDate, orquesta, municipio, hora, tipo, customTipo, programa } = formData;
    const finalOrquesta = orquesta.split(',').map(o => o.trim()).filter(Boolean).map(estandarizarNombre).join(', ');
    const finalTipo = tipo === 'Otro' ? customTipo : tipo;
    const now = new Date().toISOString();

    // Detectar qué campos cambiaron respecto al evento original para el front-end (array cambios)
    let cambios: string[] | undefined;
    if (editingEvent && !isRestoredEvent) {
      const changes: string[] = [];
      if (editingEvent.hora !== hora) changes.push('hora');
      if (editingEvent.day !== eventDate) changes.push('dia');
      
      if (editingEvent.orquesta !== finalOrquesta) {
        const oldOrqs = editingEvent.orquesta.split(',').map(o => o.trim()).filter(Boolean);
        const newOrqs = finalOrquesta.split(',').map(o => o.trim()).filter(Boolean);
        
        const added = newOrqs.filter(o => !oldOrqs.includes(o));
        const removed = oldOrqs.filter(o => !newOrqs.includes(o));
        
        if (added.length > 0 && removed.length === 0) {
          changes.push('orquesta_add');
        } else if (removed.length > 0 && added.length === 0) {
          changes.push('orquesta_rem');
        } else {
          changes.push('orquestas');
        }
      }

      if ((editingEvent.lugar || '') !== (formData.lugar || '')) changes.push('lugar');
      if (editingEvent.municipio !== municipio) changes.push('municipio');
      if (editingEvent.tipo !== finalTipo) changes.push('tipo');
      if ((editingEvent.programa || '') !== (programa || '')) changes.push('programa');
      if (changes.length > 0) cambios = changes;
    }

    const event = {
      orquesta: finalOrquesta,
      municipio,
      lugar: formData.lugar,
      hora,
      day: eventDate,
      tipo: finalTipo,
      editing: false,
      cancelado: false,
      FechaAgregado: editingEvent?.FechaAgregado || now,
      FechaEditado: now,
      programa: programa || "",
      ...(isRestoredEvent ? { reAgregado: true } : {}),
      ...(cambios ? { cambios } : {})
    };

    try {
      if (editingEvent && !isRestoredEvent) {
        await set(ref(db, `events/${editingEvent.id}`), event);
      } else {
        await push(ref(db, 'events'), event);
      }
      clearForm();
      onEventAdded();
      setSuccessMessage('Evento guardado con éxito');
      setButtonSuccess(true);
      setTimeout(() => {
        setSuccessMessage('');
        setButtonSuccess(false);
      }, 3000);
    } catch (error) {
      alert('Error al guardar el evento');
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      eventDate: '', orquesta: '', lugar: '', municipio: '',
      hora: '', tipo: 'Baile Normal', customTipo: '', programa: ''
    });
    setMunicipioSearch('');
    setShowCustomTipo(false);
    setHistoricalEvents([]);
    setMissingFields('');
    setDuplicateWarning('');
    setConflictWarnings([]);
  };

  const handleCancel = () => {
    clearForm();
    if (editingEvent) {
      onCancelEdit();
    }
  };

  const fetchIASuggestions = async () => {
    if (isGeneratingIA) return;
    
    setIsGeneratingIA(true);
    setShowIAPanel(true);
    setIaSuggestions(null);

    const apiUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/api/generate-event`;
    console.log('📡 Llamando a la IA en:', apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-internal-key': import.meta.env.VITE_APP_INTERNAL_KEY || ''
        },
        body: JSON.stringify({
          fecha: formData.eventDate,
          lugar: formData.lugar,
          municipio: formData.municipio,
          orquesta: formData.orquesta,
          accion: 'sugerir',
          historial: historicalEvents.slice(0, 5).map(h => ({
            fecha: h.event.day,
            lugar: h.event.lugar,
            municipio: h.event.municipio,
            orquesta: h.event.orquesta,
            tipo: h.event.tipo,
            hora: h.event.hora,
            programa: h.event.programa
          }))
        })
      });

      if (!response.ok) throw new Error('Error al obtener sugerencias');
      
      const data = await response.json();
      setIaSuggestions(data);
    } catch (error) {
      console.error('Error fetching IA suggestions:', error);
      alert('La IA no pudo responder en este momento. Verifica tu conexión o clave interna.');
    } finally {
      setIsGeneratingIA(false);
    }
  };

  const applyIASuggestion = (field: string, value: string) => {
    if (!value) return;
    
    if (field === 'municipio') {
      setFormData(prev => ({ ...prev, municipio: value }));
      setMunicipioSearch(value);
    } else if (field === 'tipo') {
      setFormData(prev => ({ ...prev, tipo: value }));
      setTipoSearch(value);
      setShowCustomTipo(value === 'Otro');
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6" id="form-container">
      <div className="bg-card rounded-2xl shadow-xl border border-border overflow-visible">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            {editingEvent ? <><Eye className="h-6 w-6" /><span>Editar Evento</span></> : <><Save className="h-6 w-6" /><span>Nuevo Evento</span></>}
          </h2>
          {!editingEvent && (
            <button
              onClick={fetchIASuggestions}
              disabled={isGeneratingIA}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isGeneratingIA 
                ? 'bg-white/20 text-white/50 cursor-not-allowed' 
                : 'bg-white text-indigo-600 hover:bg-white/90 shadow-lg group'
              }`}
            >
              <Sparkles className={`h-4 w-4 ${isGeneratingIA ? 'animate-spin' : 'group-hover:scale-125 transition-transform'}`} />
              <span>{isGeneratingIA ? 'Generando...' : 'Sugerir con IA'}</span>
            </button>
          )}
        </div>

        {showIAPanel && (
          <div className="border-b border-border bg-indigo-50/50 dark:bg-indigo-500/10 p-6 animate-in fade-in slide-in-from-top duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 font-bold">
                <BrainCircuit className="h-5 w-5" />
                <span>Asistente de IA</span>
              </div>
              <button onClick={() => setShowIAPanel(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {isGeneratingIA ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-indigo-600 font-medium animate-pulse">Analizando tradiciones de Tenerife...</p>
              </div>
            ) : iaSuggestions ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium italic">"{iaSuggestions.explicacion}"</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Orquestas */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Orquestas</span>
                    <div className="flex flex-wrap gap-2">
                      {iaSuggestions.orquestas?.map((o: string) => <button key={o} onClick={() => applyIASuggestion('orquesta', o)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-colors">
                            + {o}
                          </button>
                      )}
                    </div>
                  </div>

                  {/* Lugares */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lugares</span>
                    <div className="flex flex-wrap gap-2">
                      {iaSuggestions.lugares?.map((l: string) => <button key={l} onClick={() => applyIASuggestion('lugar', l)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-colors">
                            + {l}
                          </button>
                      )}
                    </div>
                  </div>

                  {/* Tipos */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipos de Evento</span>
                    <div className="flex flex-wrap gap-2">
                      {iaSuggestions.tipos?.map((t: string) => <button key={t} onClick={() => applyIASuggestion('tipo', t)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-colors">
                            + {t}
                          </button>
                      )}
                    </div>
                  </div>

                  {/* Hora y Programa */}
                  <div className="space-y-2">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hora y Programa</span>
                     <div className="flex flex-wrap gap-2">
                       {iaSuggestions.hora && (
                          <button onClick={() => applyIASuggestion('hora', iaSuggestions.hora)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">
                            🕒 Hora: {iaSuggestions.hora}
                          </button>
                       )}
                       {iaSuggestions.programa && (
                          <button onClick={() => applyIASuggestion('programa', iaSuggestions.programa)} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors">
                            📝 Aplicar Programa
                          </button>
                       )}
                     </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-500">No se pudieron cargar sugerencias.</p>
            )}
          </div>
        )}

        <div className="p-6 space-y-6">
          <FloatingLabelInput
            id="eventDate" label="Fecha del evento" value={formData.eventDate} type="date" icon={<Calendar className="h-5 w-5" />}
            onChange={v => setFormData({...formData, eventDate: v})}
            onFocus={() => { setShowOrquestaSuggestions(false); setShowLugarSuggestions(false); setShowProgramaSuggestions(false); setShowMunicipioDropdown(false); setShowTimeDropdown(false); setShowTipoDropdown(false); }}
          />

          <div ref={orquestaContainerRef}>
          <FloatingLabelInput
            id="orquesta" label="Orquesta/Grupo" value={formData.orquesta} icon={<Music className="h-5 w-5" />}
            onChange={handleOrquestaInput} showSuggestions={showOrquestaSuggestions}
            suggestions={orquestaSuggestions.filter(orq => {
              const parts = formData.orquesta.split(',');
              const lastPart = parts[parts.length - 1].trim();
              return normalizeString(orq).startsWith(normalizeString(lastPart));
            }).slice(0, 30)}
            onSuggestionClick={selectOrquesta}
            onFocus={() => { setShowLugarSuggestions(false); setShowProgramaSuggestions(false); setShowMunicipioDropdown(false); setShowTimeDropdown(false); setShowTipoDropdown(false); setShowOrquestaSuggestions(true); }}
            onClick={() => setShowOrquestaSuggestions(true)}
            inputRef={orquestaInputRef}
          />
          </div>

          <div ref={lugarContainerRef}>
          <FloatingLabelInput
            id="lugar" label="Sitio/Lugar" value={formData.lugar} icon={<MapPin className="h-5 w-5" />}
            onChange={handleLugarInput} showSuggestions={showLugarSuggestions}
            suggestions={(() => {
              const val = formData.lugar.trim();
              if (!val) return lugarSuggestions.slice(0, 30);
              const normalizeText = (str: string) => str.toLowerCase().replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '').replace(/\s+/g, ' ').trim();
              const normalizedVal = normalizeText(val);
              return matchSorter(lugarSuggestions, normalizedVal, {
                keys: [
                  (item) => normalizeText(item.lugar),
                  (item) => normalizeText(item.municipio)
                ]
              });
            })()}
            onSuggestionClick={selectLugar}
            placeholder="Casco, plaza, etc."
            onFocus={() => { setShowOrquestaSuggestions(false); setShowProgramaSuggestions(false); setShowMunicipioDropdown(false); setShowTimeDropdown(false); setShowTipoDropdown(false); setShowLugarSuggestions(true); }}
            onClick={() => setShowLugarSuggestions(true)}
            inputRef={lugarInputRef}
          />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative" ref={municipioDropdownRef}>
               <FloatingLabelInput
                 id="municipio" label="Municipio" value={municipioSearch || formData.municipio}
                 onChange={v => { setMunicipioSearch(v); setShowMunicipioDropdown(true); }}
                 onFocus={() => { setShowMunicipioDropdown(true); setShowOrquestaSuggestions(false); setShowLugarSuggestions(false); setShowTimeDropdown(false); setShowTipoDropdown(false); }}
                 onClick={() => setShowMunicipioDropdown(true)}
                 icon={<MapPin className="h-5 w-5" />}
                 inputRef={municipioInputRef}
               />
               {showMunicipioDropdown && (
                 <div className="absolute w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-80 overflow-y-auto" style={{ zIndex: 100 }}>
                   <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                     {MUNICIPIOS.filter(m => normalizeString(m).includes(normalizeString(municipioSearch))).map(m => (
                       <button key={m} className={`w-full text-left px-4 py-2 rounded-lg hover:bg-muted ${formData.municipio === m ? 'bg-indigo-50 text-indigo-600' : ''}`} onClick={() => { setFormData({...formData, municipio: m}); setMunicipioSearch(m); setShowMunicipioDropdown(false); }}>{m}</button>
                     ))}
                   </div>
                 </div>
               )}
            </div>

            <div className="relative" ref={timeDropdownRef}>
              <FloatingLabelInput
                id="hora" label="Hora" value={formData.hora} icon={<Clock className="h-5 w-5" />}
                onChange={v => { setFormData({...formData, hora: v}); setShowTimeDropdown(true); setIsTypingTime(true); }}
                onFocus={() => { setShowTimeDropdown(true); setShowOrquestaSuggestions(false); setShowLugarSuggestions(false); setShowMunicipioDropdown(false); setShowTipoDropdown(false); setIsTypingTime(false); }}
                onClick={() => { setShowTimeDropdown(true); setIsTypingTime(false); }}
                showSuggestions={showTimeDropdown}
                gridCols={3}
                gridColsMobile={3}
                suggestions={(() => {
                  const val = formData.hora.trim();
                  let results: any[] = [];
                  
                  // Mostrar SOLO el evento histórico con mayor puntuación
                  if (historicalEvents.length > 0) {
                    const bestMatch = historicalEvents[0]; // Ya viene ordenado por score descendente
                    const stars = '⭐'.repeat(Math.min(bestMatch.score, 5));
                    results.push({
                      name: bestMatch.event.hora,
                      isHistorical: true,
                      extraInfo: `${bestMatch.event.orquesta} ${stars} ${bestMatch.reasons.join(',')}`
                    });
                  }

                  const existingHours = historicalEvents.length > 0 ? [historicalEvents[0].event.hora] : [];

                  if (!val || !isTypingTime) {
                    // Si no hay búsqueda o se abrió por click/focus, mostrar todas las opciones
                    const otherOptions = timeOptions
                      .filter(t => !existingHours.includes(t))
                      .map(t => ({ name: t }));
                    return [...results, ...otherOptions];
                  }

                  // Lógica de filtro (solo si el usuario está escribiendo)
                  const searchVal = val.replace(/:/g, '');
                  const filtered = timeOptions.filter(t => {
                    const tClean = t.replace(/:/g, '');
                    return tClean.includes(searchVal) || t.includes(val);
                  });

                  const sorted = matchSorter(timeOptions, val);
                  const combined = [...new Set([...filtered, ...sorted])];
                  
                  const otherResults = combined
                    .filter(t => !existingHours.includes(t))
                    .map(t => ({ name: t }));

                  return [...results, ...otherResults];
                })()}
                onSuggestionClick={v => {
                  const val = String(v).trim();
                  const bestHist = historicalEvents.length > 0 ? historicalEvents[0] : null;
                  const isHist = bestHist && val === String(bestHist.event.hora).trim();
                  
                  setFormData(prev => ({
                    ...prev,
                    hora: val,
                    ...(isHist ? { tipo: bestHist!.event.tipo } : {})
                  }));
                  
                  if (isHist) {
                    setTipoSearch(bestHist!.event.tipo);
                    setShowCustomTipo(bestHist!.event.tipo === 'Otro');
                  }
                  
                  setIsTypingTime(false);
                  setShowTimeDropdown(false);
                }}
              />
            </div>
          </div>

          <div className="relative" ref={tipoDropdownRef}>
            <FloatingLabelInput
              id="tipo" label="Tipo de evento" value={tipoSearch || formData.tipo} icon={<Tag className="h-5 w-5" />}
              onChange={v => { setTipoSearch(v); setShowTipoDropdown(true); }}
              onFocus={() => { setShowTipoDropdown(true); setShowOrquestaSuggestions(false); setShowLugarSuggestions(false); setShowMunicipioDropdown(false); setShowTimeDropdown(false); setShowProgramaSuggestions(false); }}
                onClick={() => setShowTipoDropdown(true)}
                showSuggestions={showTipoDropdown}
                readOnly={true}
                gridCols={3}
                suggestions={(() => {
                  let results: any[] = [];
                  
                  // Mostrar SOLO el evento histórico con mayor puntuación
                  if (historicalEvents.length > 0) {
                    const bestMatch = historicalEvents[0];
                    const stars = '⭐'.repeat(Math.min(bestMatch.score, 5));
                    results.push({
                      name: bestMatch.event.tipo,
                      isHistorical: true,
                      extraInfo: `${bestMatch.event.orquesta} ${stars} ${bestMatch.reasons.join(',')}`
                    });
                  }

                  const existingTipos = historicalEvents.length > 0 ? [historicalEvents[0].event.tipo] : [];
                  const otherOptions = TIPOS_EVENTO.filter(t => !existingTipos.includes(t)).map(t => ({ name: t }));
                  
                  // Si es un campo de solo lectura (tipo select), siempre mostramos todo
                  return [...results, ...otherOptions];
                })()}
                onSuggestionClick={v => {
                  const val = String(v).trim();
                  const bestHist = historicalEvents.length > 0 ? historicalEvents[0] : null;
                  const isHist = bestHist && val === String(bestHist.event.tipo).trim();
                  
                  const finalTipo = val === 'Otro' ? 'Otro' : val;
                  setFormData(prev => ({
                    ...prev,
                    tipo: finalTipo,
                    ...(isHist ? { hora: bestHist!.event.hora } : {})
                  }));
                  
                  setTipoSearch(finalTipo);
                  setShowCustomTipo(finalTipo === 'Otro');
                  setShowTipoDropdown(false);
                }}
            />
          </div>

          {showCustomTipo && (
            <FloatingLabelInput id="customTipo" label="Especifique el tipo" value={formData.customTipo} onChange={v => setFormData({...formData, customTipo: v})} icon={<Tag className="h-5 w-5" />} />
          )}

          <FloatingLabelInput
            id="programa" label="Programa" value={formData.programa} icon={<Globe className="h-5 w-5" />}
            onChange={v => { setFormData({...formData, programa: v}); setShowProgramaSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowProgramaSuggestions(false), 200)}
            showSuggestions={showProgramaSuggestions}
            suggestionDirection="down"
            suggestionLayout="relative"
            onFocus={() => { setShowProgramaSuggestions(true); setShowOrquestaSuggestions(false); setShowLugarSuggestions(false); setShowMunicipioDropdown(false); setShowTimeDropdown(false); setShowTipoDropdown(false); }}
            suggestions={uniqueProgramas.map(p => ({ name: p })).slice(0, 30)}
            onSuggestionClick={v => { setFormData({...formData, programa: v}); setShowProgramaSuggestions(false); }}
            inputRef={programaInputRef}
          />

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                onClick={validateAndSave} disabled={isLoading || buttonSuccess}
                className={`w-full flex items-center justify-center space-x-2 font-bold py-4 px-6 rounded-xl transition-all ${
                  buttonSuccess 
                    ? 'bg-green-500 text-white animate-pulse' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isLoading ? (
                  <span>Guardando...</span>
                ) : buttonSuccess ? (
                  <><CheckCircle className="h-5 w-5" /><span>{editingEvent ? '¡Actualizado!' : '¡Creado!'}</span></>
                ) : (
                  <><Save className="h-5 w-5" /><span>{editingEvent ? 'Actualizar Evento' : 'Crear Evento'}</span></>
                )}
              </button>
              <button
                onClick={handleCancel}
                className="w-full flex items-center justify-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold py-4 px-6 rounded-xl transition-all"
              >
                <X className="h-5 w-5" /><span>{editingEvent ? 'Cancelar' : 'Limpiar'}</span>
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
