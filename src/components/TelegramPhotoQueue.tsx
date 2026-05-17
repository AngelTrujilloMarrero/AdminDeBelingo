import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, push, remove, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event } from '../types/event';
import { Camera, Send, Loader2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface TelegramPhotoQueueProps {
  events: Event[];
}

interface QueueEntry {
  lugar: string;
  municipio: string;
  label: string;
  addedAt: string;
}

interface FestivalItem {
  label: string;
  lugar: string;
  municipio: string;
}

const TELEGRAM_PHOTOS_API = `${import.meta.env.VITE_VERCEL_API_URL || 'https://de-belingo-con-angel-debelingoconangels-projects.vercel.app'}/api/telegram-send-photos`;

export default function TelegramPhotoQueue({ events }: TelegramPhotoQueueProps) {
  const [queue, setQueue] = useState<Record<string, QueueEntry>>({});
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Subscribe to queue in Firebase
  useEffect(() => {
    const queueRef = ref(db, 'telegramPhotoQueue');
    const unsubscribe = onValue(queueRef, (snapshot) => {
      setQueue(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, []);

  // Get unique festivals from events (same logic as DeBelingoConAngel's getUniqueFestivals)
  const festivals = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 2);
    cutoffDate.setHours(0, 0, 0, 0);

    const currentEvents = events.filter(event => {
      const eventDate = new Date(event.day);
      return eventDate >= cutoffDate && !event.isArchived && !event.cancelado;
    });

    // Sort by FechaAgregado (most recent first) for display order
    currentEvents.sort((a, b) => {
      const parseDate = (dateStr?: string) => {
        if (!dateStr) return 0;
        const dmy = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
        if (dmy) {
          return new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])).getTime();
        }
        return new Date(dateStr).getTime();
      };
      return parseDate(b.FechaAgregado) - parseDate(a.FechaAgregado);
    });

    const uniqueMap = new Map<string, FestivalItem>();
    currentEvents.forEach(event => {
      const label = event.lugar ? `${event.lugar}, ${event.municipio}` : event.municipio;
      if (!uniqueMap.has(label)) {
        uniqueMap.set(label, {
          label,
          lugar: event.lugar || '',
          municipio: event.municipio
        });
      }
    });

    return Array.from(uniqueMap.values());
  }, [events]);

  // Check if a festival is already in the queue
  const isInQueue = (festival: FestivalItem): string | null => {
    for (const [key, entry] of Object.entries(queue)) {
      if (entry.lugar === festival.lugar && entry.municipio === festival.municipio) {
        return key;
      }
    }
    return null;
  };

  // Toggle a festival in/out of the queue
  const toggleFestival = async (festival: FestivalItem) => {
    const existingKey = isInQueue(festival);
    if (existingKey) {
      // Remove from queue
      await remove(ref(db, `telegramPhotoQueue/${existingKey}`));
    } else {
      // Add to queue
      const queueRef = ref(db, 'telegramPhotoQueue');
      await push(queueRef, {
        lugar: festival.lugar,
        municipio: festival.municipio,
        label: festival.label,
        addedAt: new Date().toISOString()
      });
    }
  };

  // Send queue now (manual trigger)
  const sendQueueNow = async () => {
    if (Object.keys(queue).length === 0) return;

    setIsSending(true);
    setSendResult(null);

    try {
      const response = await fetch(TELEGRAM_PHOTOS_API, { method: 'GET' });
      const data = await response.json();

      if (data.success) {
        setSendResult({
          success: true,
          message: `✅ ${data.sent || 0} cartel${(data.sent || 0) !== 1 ? 'es' : ''} enviado${(data.sent || 0) !== 1 ? 's' : ''} a Telegram`
        });
      } else {
        setSendResult({
          success: false,
          message: `❌ Error: ${data.error || 'Unknown error'}`
        });
      }
    } catch (error: any) {
      setSendResult({
        success: false,
        message: `❌ Error de conexión: ${error.message}`
      });
    } finally {
      setIsSending(false);
      // Clear result after 5 seconds
      setTimeout(() => setSendResult(null), 5000);
    }
  };

  // Clear entire queue
  const clearQueue = async () => {
    if (!confirm('¿Vaciar toda la cola de fotos?')) return;
    await remove(ref(db, 'telegramPhotoQueue'));
  };

  const queueCount = Object.keys(queue).length;

  return (
    <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-foreground">Cola de Fotos para Telegram</h3>
            <p className="text-xs text-muted-foreground">
              Selecciona fiestas para enviar carteles al canal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {queueCount > 0 && (
            <span className="bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-bold px-3 py-1.5 rounded-full border border-violet-500/30 animate-pulse">
              📸 {queueCount} en cola
            </span>
          )}
          <svg
            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Festival list with checkboxes */}
          {festivals.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto space-y-1.5 pr-1">
              {festivals.map((festival) => {
                const queueKey = isInQueue(festival);
                const inQueue = !!queueKey;

                return (
                  <button
                    key={festival.label}
                    onClick={() => toggleFestival(festival)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left
                      ${inQueue
                        ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 shadow-sm'
                        : 'bg-background border-border hover:border-violet-300 dark:hover:border-violet-700 hover:bg-muted/30'
                      }
                    `}
                  >
                    {/* Checkbox */}
                    <div className={`
                      w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                      ${inQueue
                        ? 'bg-violet-500 border-violet-500 text-white shadow-sm'
                        : 'border-gray-400 dark:border-gray-500'
                      }
                    `}>
                      {inQueue && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Festival label */}
                    <span className={`text-sm font-medium flex-1 ${inQueue ? 'text-violet-800 dark:text-violet-200' : 'text-foreground'}`}>
                      Verbenas de {festival.label}
                    </span>

                    {/* In queue indicator */}
                    {inQueue && (
                      <span className="text-[10px] font-bold text-violet-500 dark:text-violet-400 uppercase tracking-wider">
                        En cola
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No hay fiestas disponibles</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              {queueCount > 0 && (
                <button
                  onClick={clearQueue}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vaciar cola
                </button>
              )}
            </div>

            <button
              onClick={sendQueueNow}
              disabled={queueCount === 0 || isSending}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar cola ahora ({queueCount})
                </>
              )}
            </button>
          </div>

          {/* Send result feedback */}
          {sendResult && (
            <div className={`
              flex items-center gap-2 p-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300
              ${sendResult.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }
            `}>
              {sendResult.success
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />
              }
              {sendResult.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
