import { useState, useEffect } from 'react';
import { ref, onValue, update, push } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event } from '../types/event';
import { Orchestra } from '../types/orchestra';
import { estandarizarNombre } from '../lib/utils';
import { Music, Users, User, Triangle } from 'lucide-react';

interface FormationTaggerProps {
    events: Event[];
}

export default function FormationTagger({ events }: FormationTaggerProps) {
    const [storedOrchestras, setStoredOrchestras] = useState<Orchestra[]>([]);
    const [untaggedFormations, setUntaggedFormations] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch existing orchestras
    useEffect(() => {
        const orchestrasRef = ref(db, 'orchestras');
        const unsubscribe = onValue(orchestrasRef, (snapshot) => {
            const data = snapshot.val();
            const loaded: Orchestra[] = [];
            if (data) {
                Object.entries(data).forEach(([key, value]: [string, any]) => {
                    loaded.push({ id: key, ...value });
                });
            }
            setStoredOrchestras(loaded);
        });
        return () => unsubscribe();
    }, []);

    // Calculate untagged formations
    useEffect(() => {
        if (events.length === 0) return;

        // 1. Get all unique formation names from events
        const allFormations = events.flatMap(e =>
            e.orquesta.split(',').map(o => o.trim())
        ).filter(name => name.length > 0);

        const uniqueFormations = [...new Set(allFormations)];

        // 2. Filter those that don't have a type in storedOrchestras
        const untagged = uniqueFormations.filter(name => {
            const normalizedName = estandarizarNombre(name);
            const orchestra = storedOrchestras.find(
                o => estandarizarNombre(o.name) === normalizedName
            );
            return !orchestra || !orchestra.type;
        }).sort();

        setUntaggedFormations(untagged);
        // Reset index if it's out of bounds after update
        if (currentIndex >= untagged.length && untagged.length > 0) {
            setCurrentIndex(0);
        }
    }, [events, storedOrchestras]);

    const handleTag = async (type: 'orquesta' | 'grupo' | 'solista') => {
        if (untaggedFormations.length === 0 || isSaving) return;

        const currentName = untaggedFormations[currentIndex];
        const normalizedName = estandarizarNombre(currentName);
        setIsSaving(true);

        try {
            const existing = storedOrchestras.find(
                o => estandarizarNombre(o.name) === normalizedName
            );

            if (existing) {
                // Update existing
                const orchestraRef = ref(db, `orchestras/${existing.id}`);
                await update(orchestraRef, {
                    type,
                    lastUpdated: new Date().toISOString()
                });
            } else {
                // Create new
                const orchestrasRef = ref(db, 'orchestras');
                const newOrchestra = {
                    name: normalizedName,
                    type,
                    phone: '',
                    facebook: '',
                    instagram: '',
                    other: '',
                    lastUpdated: new Date().toISOString()
                };
                await push(orchestrasRef, newOrchestra);
            }
        } catch (error) {
            console.error('Error tagging formation:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (untaggedFormations.length === 0) return null;

    const currentFormation = untaggedFormations[currentIndex];

    return (
        <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Music className="h-5 w-5" />
                        <span>Clasificar Formaciones</span>
                    </h3>
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                        {untaggedFormations.length} pendientes
                    </span>
                </div>
            </div>

            <div className="p-6">
                <div className="text-center mb-8">
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Formación actual</p>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 truncate px-4">
                        {currentFormation}
                    </h2>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => handleTag('orquesta')}
                        disabled={isSaving}
                        className="group flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105"
                    >
                        <div className="relative">
                            <Triangle className="w-12 h-12 text-indigo-500 fill-indigo-100 group-hover:fill-indigo-500 group-hover:text-indigo-600 transition-colors" />
                            <Users className="w-5 h-5 text-indigo-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3" />
                        </div>
                        <span className="font-bold text-gray-700">Orquesta</span>
                    </button>

                    <button
                        onClick={() => handleTag('grupo')}
                        disabled={isSaving}
                        className="group flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 transform hover:scale-105"
                    >
                        <div className="relative">
                            <Triangle className="w-12 h-12 text-purple-500 fill-purple-100 group-hover:fill-purple-500 group-hover:text-purple-600 transition-colors" />
                            <Music className="w-5 h-5 text-purple-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3" />
                        </div>
                        <span className="font-bold text-gray-700">Grupo</span>
                    </button>

                    <button
                        onClick={() => handleTag('solista')}
                        disabled={isSaving}
                        className="group flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-pink-500 hover:bg-pink-50 transition-all duration-300 transform hover:scale-105"
                    >
                        <div className="relative">
                            <Triangle className="w-12 h-12 text-pink-500 fill-pink-100 group-hover:fill-pink-500 group-hover:text-pink-600 transition-colors" />
                            <User className="w-5 h-5 text-pink-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3" />
                        </div>
                        <span className="font-bold text-gray-700">Solista</span>
                    </button>
                </div>
            </div>

            {isSaving && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
}
