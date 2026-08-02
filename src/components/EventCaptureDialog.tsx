import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas-pro';
import JSZip from 'jszip';
import { Event } from '../types/event';
import { Camera, X, Check, Calendar, MapPin, Download, Loader2, AlertTriangle, CheckCircle2, AlertCircle, FolderArchive } from 'lucide-react';
import EventCaptureCard from './EventCaptureCard';
import { fetchAemetAlerts, getAlertForEvent, AemetAlert } from '../services/aemetAlerts';

interface EventCaptureDialogProps {
    events: Event[];
    onClose: () => void;
}

const PALETTE = ['#c084fc', '#f97316', '#84cc16', '#06b6d4', '#d946ef', '#10b981', '#f43f5e', '#8b5cf6', '#eab308', '#14b8a6'];

const FIXED_TYPE_SET = new Set([
    'Baile Normal', 'Romería', 'Baile Magos', 'Tapas y Vinos', 'Paseo Romero',
    'Tapas', 'Romería Chica', 'Carnaval', 'Taifa', 'Infantil', 'Inclusiva',
    'Vinos', 'Aniversario', 'Solidario', 'Romería Barquera', 'Pamela',
    'Blanco', 'Sombrero', 'Sardinada', 'FIN DE AÑO', 'Cerveza', 'Otro'
]);

const fmt = (d: Date) => d.toISOString().split('T')[0];

const getVisibleWindow = (): { start: string; end: string } => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMs = 24 * 60 * 60 * 1000;
    const dayAt = (offset: number, endOfDay = false) => {
        const d = new Date(todayStart.getTime() + offset * dayMs);
        if (endOfDay) d.setHours(23, 59, 59, 999);
        return d;
    };
    const mondayOffset = (dayOfWeek + 6) % 7;
    const start = dayAt(-1);
    return { start: fmt(start), end: fmt(dayAt(4 - mondayOffset, true)) };
};

const sanitize = (s: string) => {
    return s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ñ/g, 'n')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 45);
};

export default function EventCaptureDialog({ events, onClose }: EventCaptureDialogProps) {
    const initialWindow = useMemo(() => getVisibleWindow(), []);
    const [startDate, setStartDate] = useState(initialWindow.start);
    const [endDate, setEndDate] = useState(initialWindow.end);
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
    const [aemetAlerts, setAemetAlerts] = useState<AemetAlert[]>([]);
    const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [zipData, setZipData] = useState<{ blob: Blob; name: string } | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchAemetAlerts().then(alerts => {
            if (!cancelled) {
                setAemetAlerts(alerts);
                setIsLoadingAlerts(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const rangeEvents = useMemo(() => {
        const from = startDate ? new Date(`${startDate}T00:00:00`) : null;
        const to = endDate ? new Date(`${endDate}T23:59:59`) : null;
        return events
            .filter(e => {
                if (e.isArchived || e.cancelado) return false;
                const d = new Date(`${e.day}T00:00:00`);
                if (from && d < from) return false;
                if (to && d > to) return false;
                return true;
            })
            .sort((a, b) => new Date(`${a.day}T${a.hora}`).getTime() - new Date(`${b.day}T${b.hora}`).getTime());
    }, [events, startDate, endDate]);

    useEffect(() => {
        setSelectedEventIds(new Set(rangeEvents.map(e => e.id)));
    }, [rangeEvents]);

    const tipoColorHex = useMemo(() => {
        const map: Record<string, string> = {};
        let pi = 0;
        rangeEvents.forEach(e => {
            if (FIXED_TYPE_SET.has(e.tipo) || map[e.tipo]) return;
            map[e.tipo] = PALETTE[pi++ % PALETTE.length];
        });
        return map;
    }, [rangeEvents]);

    const toggleEvent = (id: string) => {
        setSelectedEventIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedEventIds.size === rangeEvents.length) {
            setSelectedEventIds(new Set());
        } else {
            setSelectedEventIds(new Set(rangeEvents.map(e => e.id)));
        }
    };

    const captureEvent = useCallback((event: Event): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const container = document.createElement('div');
            container.style.cssText = `
                position: absolute;
                top: -9999px;
                left: -9999px;
                width: 640px;
                background-color: #111827;
                z-index: -1;
                pointer-events: none;
            `;
            document.body.appendChild(container);
            const root = createRoot(container);
            const alerts = getAlertForEvent(aemetAlerts, event.municipio, event.day, event.hora);
            root.render(
                <EventCaptureCard event={event} alerts={alerts} tipoColorHex={tipoColorHex} />
            );

            setTimeout(async () => {
                try {
                    const height = container.scrollHeight;
                    const canvas = await html2canvas(container, {
                        width: 640,
                        height,
                        windowWidth: 640,
                        windowHeight: height,
                        backgroundColor: '#111827',
                        useCORS: true,
                        scale: 2,
                        logging: false
                    });

                    let quality = 0.85;
                    if (height > 2000) quality = 0.65;
                    else if (height > 1500) quality = 0.75;
                    else if (height < 800) quality = 0.9;

                    const blob: Blob = await new Promise((res, rej) => {
                        canvas.toBlob(b => {
                            if (b) res(b);
                            else rej(new Error('toBlob failed'));
                        }, 'image/jpeg', quality);
                    });
                    resolve(blob);
                } catch (err) {
                    reject(err);
                } finally {
                    root.unmount();
                    document.body.removeChild(container);
                }
            }, 1200);
        });
    }, [aemetAlerts, tipoColorHex]);

    const generateZip = async () => {
        const selectedEvents = rangeEvents.filter(e => selectedEventIds.has(e.id));
        if (selectedEvents.length === 0) {
            alert('Selecciona al menos un evento.');
            return;
        }

        setIsGenerating(true);
        setResult(null);
        setZipData(null);
        setProgress({ current: 0, total: selectedEvents.length });

        try {
            const zip = new JSZip();
            const rootFolder = zip.folder(`capturas_${startDate}_${endDate}`);

            if (!rootFolder) throw new Error('No se pudo crear el ZIP');

            for (let i = 0; i < selectedEvents.length; i++) {
                const event = selectedEvents[i];
                setProgress({ current: i + 1, total: selectedEvents.length });

                const blob = await captureEvent(event);

                const dayFolder = event.day.split('T')[0];
                const firstOrquesta = (event.orquesta.split(',')[0] || 'evento').trim();
                const fileName = `${event.hora.replace(':', '-')}_${sanitize(event.municipio)}_${sanitize(event.lugar || 'Casco')}_${sanitize(firstOrquesta)}.jpg`;

                rootFolder.folder(dayFolder)?.file(fileName, blob);
            }

            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            const zipName = `capturas_${startDate}_${endDate}.zip`;
            setZipData({ blob: zipBlob, name: zipName });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = zipName;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 10000);

            setResult({ success: true, message: `ZIP generado con ${selectedEvents.length} captura(s)` });
        } catch (error: any) {
            console.error('Error generando capturas:', error);
            setResult({ success: false, message: `Error: ${error.message}` });
        } finally {
            setIsGenerating(false);
            setProgress(null);
        }
    };

    const downloadZipAgain = () => {
        if (!zipData) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipData.blob);
        link.download = zipData.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Camera className="w-6 h-6" />
                        Descargar capturas de eventos
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoadingAlerts && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cargando alertas AEMET...
                        </div>
                    )}
                    {!isLoadingAlerts && aemetAlerts.length === 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <AlertTriangle className="w-4 h-4" />
                            No hay alertas AEMET activas para Tenerife.
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Intervalo de fechas
                            </label>
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="capture-from" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</label>
                                    <input
                                        id="capture-from"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="capture-to" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
                                    <input
                                        id="capture-to"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                Cada captura reproduce la tarjeta del evento tal y como aparece en debelingo, con icono del tiempo y alertas AEMET. Se descargan como fotos optimizadas (JPEG) organizadas por día en orden cronológico.
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Eventos en el intervalo ({selectedEventIds.size}/{rangeEvents.length})
                                </label>
                                {rangeEvents.length > 0 && (
                                    <button
                                        onClick={toggleAll}
                                        className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                    >
                                        {selectedEventIds.size === rangeEvents.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                    </button>
                                )}
                            </div>

                            {rangeEvents.length > 0 ? (
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 max-h-[300px] overflow-y-auto p-2 space-y-2">
                                    {rangeEvents.map(event => {
                                        const eventAlerts = getAlertForEvent(aemetAlerts, event.municipio, event.day, event.hora);
                                        return (
                                            <button
                                                type="button"
                                                key={event.id}
                                                onClick={() => toggleEvent(event.id)}
                                                className={`
                                                    flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all w-full text-left
                                                    ${selectedEventIds.has(event.id)
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'}
                                                `}
                                            >
                                                <div className={`
                                                    w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors
                                                    ${selectedEventIds.has(event.id)
                                                        ? 'bg-blue-500 border-blue-500 text-white'
                                                        : 'border-gray-400 dark:border-gray-500'}
                                                `}>
                                                    {selectedEventIds.has(event.id) && <Check className="w-3 h-3" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-baseline gap-2">
                                                        <span className="font-bold text-gray-900 dark:text-gray-100">{event.orquesta}</span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                            {event.tipo}
                                                        </span>
                                                        {eventAlerts.length > 0 && (
                                                            <span className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                Alerta AEMET
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-3 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(event.day).toLocaleDateString('es-ES')}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {event.lugar || 'Casco'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-[100px] flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                    No hay eventos en el intervalo seleccionado.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={generateZip}
                            disabled={selectedEventIds.size === 0 || isGenerating}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Capturando {progress?.current || 0}/{progress?.total || 0}...
                                </>
                            ) : (
                                <>
                                    <FolderArchive className="w-5 h-5" />
                                    Generar y descargar ZIP
                                </>
                            )}
                        </button>
                    </div>

                    {result && (
                        <div className={`
                            flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium animate-in fade-in duration-300
                            ${result.success
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            }
                        `}>
                            {result.success
                                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            }
                            {result.message}
                            {zipData && (
                                <button
                                    onClick={downloadZipAgain}
                                    className="ml-2 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Descargar de nuevo
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
