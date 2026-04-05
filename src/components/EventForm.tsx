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
  Globe
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
  const [municipioSearch, setMunicipioSearch] = useState('');
  const [tipoSearch, setTipoSearch] = useState('');
  const [historicalEvent, setHistoricalEvent] = useState<Event | null>(null);

  const municipioDropdownRef = useRef<HTMLDivElement>(null);
  const municipioInputRef = useRef<HTMLInputElement>(null);

  const timeOptions = generateTimeOptions();

  // Efecto para buscar coincidencias históricas (continuidad)
  useEffect(() => {
    const { eventDate, lugar, municipio } = formData;
    if (eventDate && lugar && municipio) {
      const dateObj = new Date(eventDate);
      if (!isNaN(dateObj.getTime())) {
        const currentMonth = dateObj.getMonth();
        const currentDay = dateObj.getDate();

        const match = events.find(e => {
          if (!e.lugar || !e.municipio) return false;
          const eDate = new Date(e.day);
          return eDate.getMonth() === currentMonth && 
                 Math.abs(eDate.getDate() - currentDay) <= 5 && 
                 normalizeString(e.lugar!) === normalizeString(lugar) && 
                 normalizeString(e.municipio!) === normalizeString(municipio);
        });
        setHistoricalEvent(match || null);
      }
    } else {
      setHistoricalEvent(null);
    }
  }, [formData.eventDate, formData.lugar, formData.municipio, events]);

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
    setShowOrquestaSuggestions(false);
  };

  const selectLugar = (item: { lugar: string; municipio: string }) => {
    setFormData({ ...formData, lugar: item.lugar, municipio: item.municipio });
    setMunicipioSearch(item.municipio);
    setShowLugarSuggestions(false);
    setShowOrquestaSuggestions(false);
    setShowTimeDropdown(false);
    setShowTipoDropdown(false);
    setShowMunicipioDropdown(false);
    setShowProgramaSuggestions(false);
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
      setTimeout(() => setSuccessMessage(''), 3000);
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
    setHistoricalEvent(null);
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
      <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            {editingEvent ? <><Eye className="h-6 w-6" /><span>Editar Evento</span></> : <><Save className="h-6 w-6" /><span>Nuevo Evento</span></>}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <FloatingLabelInput
            id="eventDate" label="Fecha del evento" value={formData.eventDate} type="date" icon={<Calendar className="h-5 w-5" />}
            onChange={v => setFormData({...formData, eventDate: v})}
            onFocus={() => { setShowOrquestaSuggestions(false); setShowLugarSuggestions(false); setShowProgramaSuggestions(false); setShowMunicipioDropdown(false); setShowTimeDropdown(false); setShowTipoDropdown(false); }}
          />

          <FloatingLabelInput
            id="orquesta" label="Orquesta/Grupo" value={formData.orquesta} icon={<Music className="h-5 w-5" />}
            onChange={handleOrquestaInput} showSuggestions={showOrquestaSuggestions}
            suggestions={orquestaSuggestions.filter(orq => {
              const parts = formData.orquesta.split(',');
              const lastPart = parts[parts.length - 1].trim();
              return normalizeString(orq).startsWith(normalizeString(lastPart));
            })}
            onSuggestionClick={selectOrquesta}
            onFocus={() => { setShowLugarSuggestions(false); setShowProgramaSuggestions(false); setShowMunicipioDropdown(false); setShowTimeDropdown(false); setShowTipoDropdown(false); setShowOrquestaSuggestions(true); }}
            inputRef={orquestaInputRef}
          />

          <FloatingLabelInput
            id="lugar" label="Sitio/Lugar" value={formData.lugar} icon={<MapPin className="h-5 w-5" />}
            onChange={handleLugarInput} showSuggestions={showLugarSuggestions}
            suggestions={(() => {
              const val = formData.lugar.trim();
              if (!val) return lugarSuggestions;
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
            inputRef={lugarInputRef}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative" ref={municipioDropdownRef}>
               <FloatingLabelInput
                 id="municipio" label="Municipio" value={municipioSearch || formData.municipio}
                 onChange={v => { setMunicipioSearch(v); setShowMunicipioDropdown(true); }}
                 onFocus={() => { setShowMunicipioDropdown(true); setShowOrquestaSuggestions(false); setShowLugarSuggestions(false); setShowTimeDropdown(false); setShowTipoDropdown(false); }}
                 icon={<MapPin className="h-5 w-5" />}
               />
               {showMunicipioDropdown && (
                 <div className="absolute w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto" style={{ zIndex: 100 }}>
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
                onChange={v => { setFormData({...formData, hora: v}); setShowTimeDropdown(true); }}
                onFocus={() => { setShowTimeDropdown(true); setShowOrquestaSuggestions(false); setShowLugarSuggestions(false); setShowMunicipioDropdown(false); setShowTipoDropdown(false); }}
              />
              {showTimeDropdown && (
                <div className="absolute z-[9999] w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto p-2 grid grid-cols-2 gap-1">
                  {[...(historicalEvent?.hora ? [historicalEvent.hora] : []), ...timeOptions].slice(0, 20).map((t, idx) => (
                    <button key={`${t}-${idx}`} className={`text-left px-4 py-2 rounded-lg hover:bg-muted relative ${historicalEvent?.hora === t ? 'border-l-4 border-amber-500' : ''}`} onClick={() => { setFormData({...formData, hora: t}); setShowTimeDropdown(false); }}>
                      {t} {historicalEvent?.hora === t && (
                        <span className="absolute right-1 top-1 text-[8px] text-amber-600 font-bold">
                          Histórico <span className="font-normal opacity-80 text-[7px]">({historicalEvent.orquesta})</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative" ref={tipoDropdownRef}>
            <FloatingLabelInput
              id="tipo" label="Tipo de evento" value={tipoSearch || formData.tipo} icon={<Tag className="h-5 w-5" />}
              onChange={v => { setTipoSearch(v); setShowTipoDropdown(true); }}
              onFocus={() => { setShowTipoDropdown(true); setShowOrquestaSuggestions(false); setShowLugarSuggestions(false); setShowMunicipioDropdown(false); setShowTimeDropdown(false); }}
            />
            {showTipoDropdown && (
              <div className="absolute z-[9999] w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto p-2 grid grid-cols-2 gap-1">
                {[...(historicalEvent?.tipo ? [historicalEvent.tipo] : []), ...TIPOS_EVENTO.filter(t => t !== historicalEvent?.tipo)].map((t, idx) => (
                  <button key={`${t}-${idx}`} className={`text-left px-4 py-2 rounded-lg hover:bg-muted relative ${historicalEvent?.tipo === t ? 'border-l-4 border-amber-500' : ''}`} onClick={() => { setFormData({...formData, tipo: t}); setTipoSearch(t); setShowCustomTipo(t === 'Otro'); setShowTipoDropdown(false); }}>
                    {t} {historicalEvent?.tipo === t && (
                      <span className="absolute right-1 top-1 text-[8px] text-amber-600 font-bold">
                        Histórico <span className="font-normal opacity-80 text-[7px]">({historicalEvent.orquesta})</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {showCustomTipo && (
            <FloatingLabelInput id="customTipo" label="Especifique el tipo" value={formData.customTipo} onChange={v => setFormData({...formData, customTipo: v})} icon={<Tag className="h-5 w-5" />} />
          )}

          <FloatingLabelInput
            id="programa" label="Programa" value={formData.programa} icon={<Globe className="h-5 w-5" />}
            onChange={v => { setFormData({...formData, programa: v}); setShowProgramaSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowProgramaSuggestions(false), 200)}
            showSuggestions={showProgramaSuggestions}
            onFocus={() => { setShowProgramaSuggestions(true); setShowOrquestaSuggestions(false); setShowLugarSuggestions(false); setShowMunicipioDropdown(false); setShowTimeDropdown(false); setShowTipoDropdown(false); }}
            suggestions={uniqueProgramas.map(p => ({ name: p })).slice(0, 10)}
            onSuggestionClick={v => { setFormData({...formData, programa: v}); setShowProgramaSuggestions(false); }}
            inputRef={programaInputRef}
          />

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                onClick={validateAndSave} disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all"
              >
                {isLoading ? <span>Guardando...</span> : <><Save className="h-5 w-5" /><span>{editingEvent ? 'Actualizar Evento' : 'Crear Evento'}</span></>}
              </button>
              <button
                onClick={handleCancel}
                className="w-full flex items-center justify-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold py-4 px-6 rounded-xl transition-all"
              >
                <X className="h-5 w-5" /><span>Cancelar</span>
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
