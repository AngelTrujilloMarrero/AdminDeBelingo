import { useState, useEffect } from 'react';
import { Save, TrendingUp } from 'lucide-react';

import { set, get } from 'firebase/database';
import { socialFollowersRef } from '../lib/firebase';

export default function SocialStatsSync() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isManualMode, setIsManualMode] = useState(false);

    // Estados para edición manual
    const [manualStats, setManualStats] = useState({
        Instagram: '',
        WhatsApp: ''
    });

    // Cargar datos existentes al montar
    useEffect(() => {
        const fetchCurrentStats = async () => {
            try {
                const snapshot = await get(socialFollowersRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    setManualStats({
                        Instagram: data.Instagram || '9.000',
                        WhatsApp: data.WhatsApp || '2.200'
                    });
                } else {
                    // Fallback por defecto si no existen datos
                    setManualStats({
                        Instagram: '9.000',
                        WhatsApp: '2.200'
                    });
                }
            } catch (error) {
                console.error("Error al obtener datos iniciales", error);
            }
        };
        fetchCurrentStats();
    }, []);

    /**
     * Guarda los valores introducidos manualmente
     */
    const handleManualSave = async () => {
        setIsLoading(true);
        setMessage('');

        try {
            const dataToSave = {
                ...manualStats,
                lastUpdated: new Date().toLocaleDateString('es-ES')
            };

            await set(socialFollowersRef, dataToSave);
            setMessage('✅ Datos actualizados manualmente con éxito');
            setIsManualMode(false);
        } catch (error) {
            console.error('Error guardando datos:', error);
            setMessage('❌ Error al guardar los datos');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">
                            Sincronización de Redes Sociales
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Actualiza las estadísticas de seguidores
                        </p>
                    </div>
                </div>
            </div>

            {!isManualMode ? (
                <div className="space-y-4">
                    <div className="flex justify-center">
                        <button
                            onClick={() => setIsManualMode(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg
                         hover:bg-purple-700 transition-colors shadow-md"
                        >
                            <Save className="h-5 w-5" />
                            Editar Estadísticas Manualmente
                        </button>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg ${message.includes('✅')
                            ? 'bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300'
                            : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300'
                            }`}>
                            {message}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-3">
                            Introduce los valores actuales de tus redes sociales:
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Instagram */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Instagram
                                </label>
                                <input
                                    type="text"
                                    value={manualStats.Instagram}
                                    onChange={(e) => setManualStats({ ...manualStats, Instagram: e.target.value })}
                                    placeholder="9.000"
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 
                           focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
                                />
                            </div>

                            {/* WhatsApp */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    WhatsApp
                                </label>
                                <input
                                    type="text"
                                    value={manualStats.WhatsApp}
                                    onChange={(e) => setManualStats({ ...manualStats, WhatsApp: e.target.value })}
                                    placeholder="2.200"
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 
                           focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleManualSave}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg
                         hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="h-4 w-4" />
                                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>

                            <button
                                onClick={() => setIsManualMode(false)}
                                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg ${message.includes('✅')
                            ? 'bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300'
                            : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300'
                            }`}>
                            {message}
                        </div>
                    )}
                </div>
            )}

            {/* Instrucciones para obtener datos reales */}
            <details className="mt-6">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    📖 ¿Cómo obtener los datos reales?
                </summary>
                <div className="mt-3 text-sm text-muted-foreground space-y-2 bg-muted/30 p-4 rounded-lg">
                    <p><strong>Instagram:</strong> Abre tu perfil → Mira el número de seguidores</p>
                    <p><strong>WhatsApp:</strong> Abre tu canal → Configuración → Ver estadísticas</p>
                    <hr className="my-2 border-border" />
                    <p className="text-xs text-muted-foreground/60">
                        💡 <strong>Nota:</strong> Facebook y Telegram fueron cerrados el 23 de enero de 2026.
                        Solo se gestionan Instagram y WhatsApp.
                    </p>
                </div>
            </details>
        </div>
    );
}
