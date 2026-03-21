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
  EyeOff,
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
  const [programaSuggestions, setProgramaSuggestions] = useState<string[]>([]);
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

  const municipioDropdownRef = useRef<HTMLDivElement>(null);
  const municipioInputRef = useRef<HTMLInputElement>(null);

  const timeOptions = generateTimeOptions();

  // Effect to auto-fill program
  useEffect(() => {
    const { eventDate, lugar, municipio, programa } = formData;

    // Only run if we have the necessary fields and program is empty
    if (eventDate && lugar && municipio && !programa) {
      // Debounce slightly to avoid rapid updates while typing? Not strictly necessary for local filtering
      const dateObj = new Date(eventDate);
      if (!isNaN(dateObj.getTime())) {
        // Find NEAREST event with program
        const nearbyEvent = events
          .filter(ev =>
            ev.programa &&
            ev.programa.trim() !== '' &&
            normalizeString(ev.municipio) === normalizeString(municipio) &&
            normalizeString(ev.lugar) === normalizeString(lugar)
          )
          .map(ev => {
            const diff = Math.abs(new Date(ev.day).getTime() - dateObj.getTime());
            return { ...ev, diff };
          })
          .filter(ev => ev.diff <= 20 * 24 * 60 * 60 * 1000) // 20 days window
          .sort((a, b) => a.diff - b.diff)[0]; // Sort by proximity

        if (nearbyEvent && nearbyEvent.programa) {
          setFormData(prev => ({ ...prev, programa: nearbyEvent.programa! }));
        }
      }
    }
  }, [formData.eventDate, formData.lugar, formData.municipio]); // Don't include formData.programa to avoid loops (we only set if empty)


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
    const uniqueOrquestas = [...new Set(allOrquestas)].filter(Boolean).sort();
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

    // LOGICA DE PROGRAMA AUTOMATICO:
    // Si estamos editando datos (fecha, lugar, municipio) y el campo programa está vácio...
    // Buscar si existe un evento cercano (mismo lugar/municipio, +/- 20 días) que tenga programa.
    const { eventDate, lugar, municipio, programa } = formData;

    // Solo si tenemos fecha, lugar, municipio y NO hay programa escrito manualmente
    if (eventDate && lugar && municipio && !programa) {
      const dateObj = new Date(eventDate);
      if (!isNaN(dateObj.getTime())) {
        const nearbyEventWithProgram = events.find(ev => {
          // Mismo sitio
          if (normalizeString(ev.municipio) !== normalizeString(municipio) ||
            normalizeString(ev.lugar) !== normalizeString(lugar)) {
            return false;
          }

          // Tiene programa
          if (!ev.programa || !ev.programa.trim()) return false;

          // Diferencia de fechas <= 20 días (para capturar eventos de "varios días")
          // Pero > 0 (no el mismo día, aunque si fuera el mismo día también valdría)
          const evDate = new Date(ev.day);
          const diffTime = Math.abs(evDate.getTime() - dateObj.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          return diffDays <= 20;
        });

        if (nearbyEventWithProgram && nearbyEventWithProgram.programa) {
          // Autocompletar el programa
          setFormData(prev => ({ ...prev, programa: nearbyEventWithProgram.programa! }));
          // Opcional: Mostrar un toast o indicación de que se ha copiado el programa
          console.log("Programa autocompletado desde evento cercano:", nearbyEventWithProgram);
        }
      }
    }

    // Extraer programas únicos para autocompletado
    const uniqueProgramas = [...new Set(
      events
        .filter(e => e.programa && e.programa.trim())
        .map(e => e.programa.trim())
    )].sort();
    setProgramaSuggestions(uniqueProgramas);
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
    const parts = value.split(',');
    const lastPart = parts[parts.length - 1].trim();

    if (lastPart) {
      const normalizedLastPart = normalizeString(lastPart);
      const filtered = orquestaSuggestions.filter(orq =>
        normalizeString(orq).startsWith(normalizedLastPart)
      );
      setShowOrquestaSuggestions(filtered.length > 0);
    } else {
      setShowOrquestaSuggestions(false);
    }
  };

  const handleLugarInput = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, lugar: value };
      return newData;
    });

    const val = value.trim();

    if (val && lugarSuggestions.length > 0) {
      const normalizedVal = normalizeString(val);

      const scored = lugarSuggestions
        .map(item => {
          const normLugar = normalizeString(item.lugar);
          const normMunicipio = normalizeString(item.municipio);
          const normFull = `${normLugar} ${normMunicipio}`;

          let score = 100;

          if (normLugar.startsWith(normalizedVal)) {
            score = 1;
          } else if (normMunicipio.startsWith(normalizedVal)) {
            score = 2;
          } else if (normFull.startsWith(normalizedVal)) {
            score = 3;
          } else if (normLugar.includes(normalizedVal)) {
            score = 10 + levenshteinDistance(normalizedVal, normLugar);
          } else if (normMunicipio.includes(normalizedVal)) {
            score = 20 + levenshteinDistance(normalizedVal, normMunicipio);
          } else if (normFull.includes(normalizedVal)) {
            score = 30 + levenshteinDistance(normalizedVal, normFull);
          } else {
            return null;
          }

          return { item, score };
        })
        .filter((s): s is { item: { lugar: string; municipio: string }; score: number } => s !== null)
        .sort((a, b) => a.score - b.score);

      setShowLugarSuggestions(scored.length > 0);
    } else {
      setShowLugarSuggestions(false);
    }
  };

  const handleProgramaInput = (value: string) => {
    setFormData({ ...formData, programa: value });
    const val = value.trim();

    if (val) {
      const normalizedVal = normalizeString(val);
      const filtered = programaSuggestions.filter(programa =>
        normalizeString(programa).includes(normalizedVal)
      );
      setShowProgramaSuggestions(filtered.length > 0);
    } else {
      setShowProgramaSuggestions(false);
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
    setMunicipioSearch(item.municipio);
    setShowLugarSuggestions(false);
    lugarInputRef.current?.focus();
  };

  const selectPrograma = (programa: string) => {
    setFormData({ ...formData, programa });
    setShowProgramaSuggestions(false);
    programaInputRef.current?.focus();
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

    // Detectar coincidencia en 4 de 5 parámetros
    const parametrosCoincidentes = events.filter(e => {
      if (editingEvent && e.id === editingEvent.id) return false;

      // Verificar rango de 2 horas
      const currentDateTime = new Date(`${eventDate}T${hora}`);
      const existingDateTime = new Date(`${e.day}T${e.hora}`);

      const diffInHours = Math.abs(currentDateTime.getTime() - existingDateTime.getTime()) / (1000 * 60 * 60);

      // Si la diferencia es mayor a 2 horas, no se considera duplicado/conflicto para esta validación
      if (diffInHours > 2) return false;

      let matches = 0;
      // 1. Fecha
      if (e.day === eventDate) matches++;

      // 2. Municipio
      if (normalizeString(e.municipio) === normalizeString(municipio)) matches++;

      // 3. Lugar
      if (normalizeString(e.lugar) === normalizeString(formData.lugar)) matches++;

      // 4. Tipo
      const tipoActual = tipo === 'Otro' ? customTipo : tipo;
      if (normalizeString(e.tipo) === normalizeString(tipoActual)) matches++;

      // 5. Orquesta
      // Normalizamos y ordenamos las orquestas para comparar el conjunto
      const normalizeOrqs = (o: string) => o.split(',').map(x => normalizeString(x.trim())).sort().join(',');
      if (normalizeOrqs(e.orquesta) === normalizeOrqs(orquesta)) matches++;

      return matches >= 4;
    });

    if (parametrosCoincidentes.length > 0) {
      conflictosCriticos.push(
        `El evento coincide en 4 de 5 parámetros con ${parametrosCoincidentes.length} evento(s) existente(s) en un rango de 2 horas.`
      );
      parametrosCoincidentes.forEach(e => {
        conflictosDetallados.push(`Coincidencia con evento: ${e.orquesta} en ${e.lugar} (${e.municipio}) el ${e.day} a las ${e.hora}`);
      });
    }

    // NOTE: validation for 'conflictoLugar' handled separately below (removed from here in replacement)

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


    // Validar duplicados de programa con plazo de 1 mes
    if (programa && programa.trim()) {
      const programaDuplicado = events.find(ev => {
        if (editingEvent && ev.id === editingEvent.id) return false;
        if (!ev.programa || ev.programa.trim() !== programa.trim()) return false;

        const existingDate = new Date(ev.day);
        const newDate = new Date(eventDate);
        const diffDays = Math.abs(existingDate.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24);

        return diffDays <= 30; // 30 días = 1 mes
      });

      if (programaDuplicado) {
        const daysDiff = Math.round(
          Math.abs(new Date(programaDuplicado.day).getTime() - new Date(eventDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        warnings.push(
          `El programa "${programa}" ya fue utilizado hace ${daysDiff} días el ${programaDuplicado.day}. Se recomienda un mínimo de 30 días entre eventos con el mismo programa.`
        );
      }
    }

    // Mostrar advertencias pero permitir guardar
    if (warnings.length > 0) {
      setConflictWarnings(warnings);
    }

    await saveEvent();
  };

  const saveEvent = async () => {
    setIsLoading(true);
    const { eventDate, orquesta, lugar, municipio, hora, tipo, customTipo, programa } = formData;

    const orquestas = orquesta
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);

    const now = new Date().toISOString();
    const finalOrquesta = orquestas.map(estandarizarNombre).join(', ');
    const finalTipo = tipo === 'Otro' ? customTipo : tipo;

    // Detectar qué campos cambiaron respecto al evento original
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
          // Si solo hay una formación añadida, intentar ser específico con su tipo
          if (added.length === 1) {
            const addedOrq = added[0];
            const orchestraInfo = allOrchestras.find(o => estandarizarNombre(o.name) === estandarizarNombre(addedOrq));
            const type = orchestraInfo?.type || 'orquesta'; // por defecto orquesta
            changes.push(`${type}_add`);
          } else {
            changes.push('orquesta_add');
          }
        } else if (removed.length > 0 && added.length === 0) {
          if (removed.length === 1) {
            const removedOrq = removed[0];
            const orchestraInfo = allOrchestras.find(o => estandarizarNombre(o.name) === estandarizarNombre(removedOrq));
            const type = orchestraInfo?.type || 'orquesta';
            changes.push(`${type}_rem`);
          } else {
            changes.push('orquesta_rem');
          }
        } else {
          changes.push('orquestas');
        }
      }

      if ((editingEvent.lugar || '') !== (lugar || '')) changes.push('lugar');
      if (editingEvent.municipio !== municipio) changes.push('municipio');
      if (editingEvent.tipo !== finalTipo) changes.push('tipo');
      if (changes.length > 0) cambios = changes;
    }

    const event = {
      orquesta: finalOrquesta,
      municipio,
      lugar,
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
        const eventRef = ref(db, `events/${editingEvent.id}`);
        await set(eventRef, event);
      } else {
        const eventsRef = ref(db, 'events');
        await push(eventsRef, event);

        // Si es un evento restaurado, eliminarlo de la lista de eliminaciones
        if (isRestoredEvent && deletionIdToRemove) {
          const { remove } = await import('firebase/database');
          const deletionRecordRef = ref(db, `eventDeletions/${deletionIdToRemove}`);
          await remove(deletionRecordRef);
          console.log(`Restored event saved and removed from eventDeletions: ${deletionIdToRemove}`);
        }
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
      customTipo: '',
      programa: ''
    });
    setMunicipioSearch('');
    setShowCustomTipo(false);
    setMissingFields('');
    setDuplicateWarning('');
    setConflictWarnings([]);
    setHoraInvalida(false);
  };

  const handleCancel = () => {
    clearForm();
    onCancelEdit();
  };

  return (
    <div className="max-w-4xl mx-auto p-6" id="form-container">
      <div className="bg-card rounded-2xl shadow-xl border border-border">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-2xl">
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
              const lastPart = parts[parts.length - 1].trim();
              return normalizeString(orq).startsWith(normalizeString(lastPart));
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
            suggestions={(() => {
              const val = formData.lugar.trim();
              if (!val) return lugarSuggestions;

              const normalizedVal = normalizeString(val);

              return lugarSuggestions
                .map(item => {
                  const normLugar = normalizeString(item.lugar);
                  const normMunicipio = normalizeString(item.municipio);
                  const normFull = `${normLugar} ${normMunicipio}`;

                  let score = 100;

                  if (normLugar.startsWith(normalizedVal)) {
                    score = 1;
                  } else if (normMunicipio.startsWith(normalizedVal)) {
                    score = 2;
                  } else if (normFull.startsWith(normalizedVal)) {
                    score = 3;
                  } else if (normLugar.includes(normalizedVal)) {
                    score = 10 + levenshteinDistance(normalizedVal, normLugar);
                  } else if (normMunicipio.includes(normalizedVal)) {
                    score = 20 + levenshteinDistance(normalizedVal, normMunicipio);
                  } else if (normFull.includes(normalizedVal)) {
                    score = 30 + levenshteinDistance(normalizedVal, normFull);
                  } else {
                    return null;
                  }

                  return { item, score };
                })
                .filter((s): s is { item: { lugar: string; municipio: string }; score: number } => s !== null)
                .sort((a, b) => a.score - b.score)
                .map(s => s.item);
            })()}
            showSuggestions={showLugarSuggestions}
            onSuggestionClick={selectLugar}
            inputRef={lugarInputRef}
          />

          {/* Programa con autocompletado */}
          <div className="relative">
            <div className="relative">
              <input
                ref={programaInputRef}
                type="text"
                inputMode="url"
                autoComplete="url"
                value={formData.programa}
                onChange={(e) => {
                  handleProgramaInput(e.target.value);
                }}
                onFocus={() => {
                  if (formData.programa.trim()) {
                    setShowProgramaSuggestions(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowProgramaSuggestions(false), 200);
                }}
                placeholder=" "
                className={`
                  w-full px-4 py-4 pl-11 border-2 border-border rounded-xl 
                  transition-all duration-300 bg-background text-foreground
                  ${showProgramaSuggestions ? 'border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-800' : 'hover:border-muted-foreground'}
                `}
              />

              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Globe className="h-5 w-5" />
              </div>

              <label className={`
                absolute left-11 transition-all duration-300 pointer-events-none
                text-muted-foreground origin-left
                ${formData.programa
                  ? 'top-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 scale-90'
                  : 'top-1/2 -translate-y-1/2 text-base'
                }
              `}>
                Programa (URL web)
              </label>
            </div>

            {/* Dropdown de sugerencias de programas */}
            {showProgramaSuggestions && programaSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {programaSuggestions.map((programa) => (
                    <button
                      key={programa}
                      type="button"
                      onClick={() => selectPrograma(programa)}
                      className="w-full px-4 py-3 text-left rounded-lg transition-colors duration-200 text-foreground hover:bg-muted hover:text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{programa}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Grid de municipio y hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Municipio Custom Dropdown with Autocomplete */}
            <div className="relative" ref={municipioDropdownRef}>
              <div className="relative">
                <input
                  ref={municipioInputRef}
                  type="text"
                  value={municipioSearch}
                  onChange={(e) => {
                    setMunicipioSearch(e.target.value);
                    setShowMunicipioDropdown(true);
                  }}
                  onFocus={() => {
                    setShowMunicipioDropdown(true);
                  }}
                  placeholder=" "
                  className={`
                     w-full px-4 py-4 pl-11 border-2 border-border rounded-xl 
                     transition-all duration-300 bg-background text-foreground
                     ${showMunicipioDropdown ? 'border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-800' : 'hover:border-muted-foreground'}
                   `}
                />

                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <MapPin className="h-5 w-5" />
                </div>

                <label className={`
                   absolute left-11 transition-all duration-300 pointer-events-none
                   text-muted-foreground origin-left
                   ${municipioSearch || formData.municipio
                    ? 'top-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 scale-90'
                    : 'top-1/2 -translate-y-1/2 text-base'
                  }
                 `}>
                  Municipio
                </label>

                <button
                  type="button"
                  onClick={() => setShowMunicipioDropdown(!showMunicipioDropdown)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                >
                  <svg className={`w-5 h-5 transition-transform duration-300 ${showMunicipioDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Dropdown Menu */}
              {showMunicipioDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-xl max-h-80 overflow-y-auto">
                  <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                    {MUNICIPIOS
                      .filter(m => m.toLowerCase().includes(municipioSearch.toLowerCase()))
                      .map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, municipio: m });
                            setMunicipioSearch(m);
                            setShowMunicipioDropdown(false);
                          }}
                          className={`
                             px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 text-left
                             ${formData.municipio === m
                              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'
                              : 'text-foreground hover:bg-muted hover:text-foreground'
                            }
                           `}
                        >
                          {m}
                        </button>
                      ))}
                    {MUNICIPIOS.filter(m => m.toLowerCase().includes(municipioSearch.toLowerCase())).length === 0 && (
                      <div className="col-span-2 p-4 text-center text-muted-foreground italic">
                        No se encontraron municipios
                      </div>
              )}
              {horaInvalida && (
                <p className="text-red-500 text-xs mt-1 px-1">Formato inválido. Usa HH:MM (ej: 19:30)</p>
              )}
            </div>
                </div>
              )}
            </div>

            {/* Hora con autocompletado */}
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.hora}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9:]*$/.test(val) || val === '') {
                      setFormData({ ...formData, hora: val });
                      if (val.length >= 5) {
                        setHoraInvalida(!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val));
                      } else {
                        setHoraInvalida(false);
                      }
                      const filtered = timeOptions.filter(t => t.startsWith(val));
                      setShowTimeDropdown(filtered.length > 0 && val.length > 0);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = formData.hora;
                      const isValidFormat = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val);
                      if (isValidFormat) {
                        setShowTimeDropdown(false);
                        setHoraInvalida(false);
                      }
                    }
                  }}
                  onFocus={() => {
                    setShowTimeDropdown(true);
                  }}
                  onBlur={() => {
                    if (formData.hora && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.hora)) {
                      setHoraInvalida(true);
                    }
                    setTimeout(() => setShowTimeDropdown(false), 200);
                  }}
                  placeholder=" "
                  className={`
                    w-full px-4 py-4 pl-11 border-2 rounded-xl 
                    transition-all duration-300 bg-background text-foreground
                    ${horaInvalida 
                      ? 'border-red-500 ring-2 ring-red-100 dark:ring-red-800' 
                      : showTimeDropdown 
                        ? 'border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-800' 
                        : 'border-border hover:border-muted-foreground'
                    }
                  `}
                />

                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <Clock className="h-5 w-5" />
                </div>

                <label className={`
                  absolute left-11 transition-all duration-300 pointer-events-none
                  text-muted-foreground origin-left
                  ${formData.hora
                    ? 'top-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 scale-90'
                    : 'top-1/2 -translate-y-1/2 text-base'
                  }
                `}>
                  Hora de comienzo
                </label>
              </div>

              {/* Dropdown de sugerencias de horas */}
              {showTimeDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-xl max-h-72 overflow-y-auto">
                  <div className="p-2 grid grid-cols-2 gap-1">
                    {timeOptions.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, hora: time });
                          setShowTimeDropdown(false);
                        }}
                        className={`
                          px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 text-left
                          ${formData.hora === time
                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'
                            : 'text-foreground hover:bg-muted hover:text-foreground'
                          }
                        `}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tipo Custom Dropdown */}
          <div className="relative" ref={tipoDropdownRef}>
            <div
              onClick={() => setShowTipoDropdown(!showTipoDropdown)}
              className="relative cursor-pointer"
            >
              <div className={`
                 w-full px-4 py-4 pl-11 border-2 border-border rounded-xl 
                 transition-all duration-300 bg-background text-foreground
                 ${showTipoDropdown ? 'border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-800' : 'hover:border-muted-foreground'}
               `}>
                {formData.tipo || <span className="text-transparent">Selecciona el tipo</span>}
              </div>

              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                <Tag className="h-5 w-5" />
              </div>

              <label className={`
                 absolute left-11 transition-all duration-300 pointer-events-none
                 text-muted-foreground origin-left
                 ${formData.tipo
                  ? 'top-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 scale-90'
                  : 'top-1/2 -translate-y-1/2 text-base'
                }
               `}>
                Tipo de evento
              </label>
            </div>

            {/* Dropdown Menu */}
            {showTipoDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-xl max-h-80 overflow-y-auto">
                <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                  {TIPOS_EVENTO.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, tipo });
                        setShowCustomTipo(tipo === 'Otro');
                        setShowTipoDropdown(false);
                      }}
                      className={`
                         px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 text-left
                         ${formData.tipo === tipo
                          ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'
                          : 'text-foreground hover:bg-muted hover:text-foreground'
                        }
                       `}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
            <div className="flex items-center space-x-2 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-destructive font-medium">{missingFields}</p>
            </div>
          )}

          {duplicateWarning && (
            <div className="flex items-center space-x-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <p className="text-yellow-700 dark:text-yellow-300 font-medium">{duplicateWarning}</p>
            </div>
          )}

          {conflictWarnings.length > 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl space-y-2">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <p className="text-yellow-800 dark:text-yellow-200 font-semibold">Advertencias detectadas:</p>
              </div>
              <ul className="ml-7 space-y-1">
                {conflictWarnings.map((warning) => (
                  <li key={warning} className="text-yellow-700 dark:text-yellow-300 text-sm">
                    {warning}
                  </li>
                ))}
              </ul>
              <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-2 ml-7">
                El evento se guardara de todos modos. Verifica que la informacion sea correcta.
              </p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center space-x-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-green-700 dark:text-green-300 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            {!editingEvent ? (
              <button
                onClick={validateAndSave}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 bg-lime-400
                           hover:bg-lime-500 text-lime-950 font-black uppercase tracking-widest py-4 px-6 
                           rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:shadow-[0_0_25px_rgba(163,230,53,0.5)] 
                           transform hover:scale-105 active:scale-95 transition-all duration-300 
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-lime-950 border-t-transparent rounded-full animate-spin"></div>
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
                  className="w-full flex items-center justify-center space-x-2 bg-cyan-400
                             hover:bg-cyan-500 text-cyan-950 font-black uppercase tracking-widest py-4 px-6 
                             rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)]
                             transform hover:scale-105 active:scale-95 transition-all duration-300 
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-cyan-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Actualizar Evento</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full flex items-center justify-center space-x-2 bg-slate-200
                             hover:bg-slate-300 text-slate-900 font-black uppercase tracking-widest py-4 px-6 
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