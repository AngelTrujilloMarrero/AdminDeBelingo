import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Clock, Terminal, ShieldCheck } from 'lucide-react';
import { ref, onValue, remove, query, limitToLast, orderByChild, get, endAt } from 'firebase/database';
import { db } from '../lib/firebase';

interface Message {
    id: string;
    text: string;
    user?: string;
    timestamp: number;
}

export default function MessageAdmin() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCleaning, setIsCleaning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

    // Mes y medio en milisegundos (45 días)
    const AUTO_CLEAN_LIMIT = 45 * 24 * 60 * 60 * 1000;

    useEffect(() => {
        // Ejecutar limpieza automática al montar el componente
        const initialCleanup = async () => {
            const now = Date.now();
            const cutoff = now - AUTO_CLEAN_LIMIT;

            try {
                setIsCleaning(true);
                const messagesRef = ref(db, 'guestbook/messages');
                // Buscar mensajes con timestamp anterior al cutoff
                const oldMessagesQuery = query(messagesRef, orderByChild('timestamp'), endAt(cutoff));
                const snapshot = await get(oldMessagesQuery);

                if (snapshot.exists()) {
                    const oldMessages = snapshot.val();
                    const deletePromises = Object.keys(oldMessages).map(id =>
                        remove(ref(db, `guestbook/messages/${id}`))
                    );
                    await Promise.all(deletePromises);
                    console.log(`Auto-limpieza completada: ${deletePromises.length} mensajes antiguos eliminados.`);
                }
            } catch (err) {
                console.error("Error en auto-limpieza:", err);
            } finally {
                setIsCleaning(false);
            }
        };

        initialCleanup();

        const messagesRef = ref(db, 'guestbook/messages');
        const latestMessagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(150));

        const unsubscribe = onValue(latestMessagesQuery, (snapshot) => {
            setIsLoading(true);
            try {
                const data = snapshot.val();
                if (data) {
                    const loadedMessages: Message[] = Object.entries(data).map(([key, value]: [string, any]) => ({
                        id: key,
                        ...value
                    }));
                    // Ordenar por timestamp descendente
                    setMessages(loadedMessages.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
                } else {
                    setMessages([]);
                }
            } catch (err) {
                console.error("Error loading messages:", err);
                setError("Error al cargar los mensajes del chat.");
            } finally {
                setIsLoading(false);
            }
        }, (err) => {
            console.error("Firebase subscription error:", err);
            setError("No tienes permisos o hubo un error de conexión.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDeleteMessage = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este mensaje?')) return;

        try {
            await remove(ref(db, `guestbook/messages/${id}`));
        } catch (err) {
            console.error("Error deleting message:", err);
            alert("No se pudo eliminar el mensaje.");
        }
    };

    const handleDeleteAll = async () => {
        try {
            await remove(ref(db, 'guestbook/messages'));
            setShowDeleteAllConfirm(false);
        } catch (err) {
            console.error("Error clearing chat:", err);
            alert("No se pudo vaciar el chat.");
        }
    };

    const formatTimeIRC = (ts: number) => {
        const date = new Date(ts);
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDateIRC = (ts: number) => {
        return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className="bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-800 overflow-hidden font-mono text-sm mt-8">
            {/* IRC Header */}
            <div className="p-4 border-b border-gray-800 bg-[#2d2d2d] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-green-500/10 rounded">
                        <Terminal className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-200">IRC Chat Admin <span className="text-green-500">#guestbook</span></h3>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider">
                            <Clock className="h-3 w-3" />
                            Auto-purga activa: {">"}45 días
                            {isCleaning && <span className="animate-pulse text-yellow-500 ml-2">Limpiando...</span>}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowDeleteAllConfirm(true)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Flush all messages"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="flex gap-1 items-center px-2 py-1 bg-gray-800 rounded border border-gray-700 text-[10px] text-gray-400">
                        <ShieldCheck className="h-3 w-3 text-blue-400" />
                        ADMIN-MODE
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showDeleteAllConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
                    <div className="bg-[#2d2d2d] border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center justify-center w-12 h-12 bg-red-500/10 rounded-full mb-4 mx-auto">
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-100 text-center mb-2">/CLEAR_GUESTBOOK?</h4>
                        <p className="text-gray-400 text-sm text-center mb-6">Esta orden eliminará irreversiblemente todos los registros del chat.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteAllConfirm(false)}
                                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 font-medium rounded-xl hover:bg-gray-800 transition-colors"
                            >
                                ABORT
                            </button>
                            <button
                                onClick={handleDeleteAll}
                                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
                            >
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* IRC Console Content */}
            <div className="p-4 bg-[#1a1a1a] min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-green-500 text-xs uppercase tracking-widest">Iniciando protocolo...</p>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded text-red-400 flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4" />
                        <p>{error}</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-20 text-gray-600 border border-dashed border-gray-800 rounded">
                        <p className="">*** No messages found in buffer ***</p>
                    </div>
                ) : (
                    <div className="space-y-1.5 max-h-[500px] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className="group flex items-start gap-3 py-0.5 hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-green-500/30 pl-2 min-w-0"
                            >
                                <span className="text-gray-600 shrink-0 select-none text-[12px]">
                                    [{formatTimeIRC(msg.timestamp)}]
                                </span>
                                <div className="flex gap-2 flex-1 items-baseline min-w-0">
                                    <span className="text-gray-300 break-words">
                                        {msg.text}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-all shrink-0 border border-transparent hover:border-red-500/30"
                                    title="Drop message"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="px-4 py-2 bg-[#252525] border-t border-gray-800 flex justify-between items-center text-[10px] text-gray-500">
                <span>BUFFER: {messages.length} LINES</span>
                <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    CONNECTED TO RTDB-EUROPE-W1
                </span>
            </div>
        </div>
    );
}
