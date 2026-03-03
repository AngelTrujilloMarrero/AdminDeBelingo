import React, { useEffect, useState } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event } from '../types/event';
import { Trash2, RotateCcw, Calendar, MapPin, Music, Clock, AlertCircle } from 'lucide-react';

interface DeletedEventsPanelProps {
    onRestore: (event: Event) => void;
}

interface DeletionRecord {
    id: string;
    eventId: string;
    deletedAt: string;
    deletedBy: string;
    eventData: Event;
}

export default function DeletedEventsPanel({ onRestore }: DeletedEventsPanelProps) {
    const [deletedEvents, setDeletedEvents] = useState<DeletionRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const deletionsRef = ref(db, 'eventDeletions');
        const unsubscribe = onValue(deletionsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.entries(data).map(([id, value]: [string, any]) => ({
                    id,
                    ...value
                })).sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
                setDeletedEvents(list);
            } else {
                setDeletedEvents([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleRestore = async (record: DeletionRecord) => {
        try {
            // 1. Llamar a la función de restauración (cargar en el formulario arriba)
            onRestore(record.eventData);

            // 2. Eliminar de la lista de eliminados automáticamente
            const recordRef = ref(db, `eventDeletions/${record.id}`);
            await remove(recordRef);

            // Scroll up to form
            const formContainer = document.getElementById('form-container');
            if (formContainer) {
                formContainer.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error al procesar restauración:', error);
            alert('Error al intentar restaurar el evento');
        }
    };

    if (loading) return null;
    if (deletedEvents.length === 0) return null;

    return (
        <div className="max-w-4xl mx-auto p-6 mt-8">
            <div className="bg-card rounded-2xl shadow-xl border-2 border-dashed border-muted-foreground/30 overflow-hidden">
                <div className="bg-muted/50 p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <h3 className="font-bold text-lg text-foreground">Eventos Eliminados Recientemente</h3>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {deletedEvents.length} eventos
                    </span>
                </div>

                <div className="p-4">
                    <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Haz clic en "Restaurar" para cargar los datos en el formulario y confirmar su re-publicación.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {deletedEvents.slice(0, 10).map((record) => {
                            const event = record.eventData;
                            const date = new Date(event.day).toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short'
                            });

                            return (
                                <div
                                    key={record.id}
                                    className="bg-background border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-indigo-500/50 transition-colors group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-sm font-bold text-foreground capitalize">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                {date}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {event.hora}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestore(record)}
                                            className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Restaurar
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <Music className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="truncate">{event.orquesta}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span className="truncate">{event.lugar || 'Casco'}, {event.municipio}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 mt-auto border-t border-border/50 text-[10px] text-muted-foreground italic flex justify-between">
                                        <span>Eliminado: {new Date(record.deletedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {deletedEvents.length > 10 && (
                        <p className="text-center text-xs text-muted-foreground mt-4">
                            Mostrando los últimos 10 de {deletedEvents.length} eventos eliminados.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
