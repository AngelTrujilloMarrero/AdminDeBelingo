import { useState, useRef, useEffect } from 'react';
import { ref, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import FloatingLabelInput from './FloatingLabelInput';
import { Music, Phone, Globe, FileText, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Event } from '../types/event';
import { estandarizarNombre } from '../lib/utils';

interface OrchestraFormProps {
    events: Event[];
}

export default function OrchestraForm({ events }: OrchestraFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        facebook: '',
        instagram: '',
        other: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Suggestions for Orchestra Name
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Extract unique orchestra names from events
        const allOrquestas = events.flatMap(e =>
            e.orquesta.split(',').map(o => o.trim())
        );
        const uniqueOrquestas = [...new Set(allOrquestas)].sort();
        setSuggestions(uniqueOrquestas);
    }, [events]);

    const handleNameInput = (value: string) => {
        setFormData({ ...formData, name: value });

        if (value) {
            const filtered = suggestions.filter(orq =>
                orq.toLowerCase().includes(value.toLowerCase())
            );
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectOrchestra = (name: string) => {
        setFormData({ ...formData, name: name });
        setShowSuggestions(false);
    };

    const handleSubmit = async () => {
        if (!formData.name) {
            setErrorMessage('El nombre de la orquesta es obligatorio');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const orchestrasRef = ref(db, 'orchestras');
            const newOrchestra = {
                name: estandarizarNombre(formData.name),
                phone: formData.phone,
                facebook: formData.facebook,
                instagram: formData.instagram,
                other: formData.other,
                lastUpdated: new Date().toISOString()
            };

            await push(orchestrasRef, newOrchestra);

            setSuccessMessage('Datos de orquesta guardados correctamente');
            setFormData({
                name: '',
                phone: '',
                facebook: '',
                instagram: '',
                other: ''
            });
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error saving orchestra:', error);
            setErrorMessage('Error al guardar los datos. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Music className="h-6 w-6" />
                    <span>Datos de Orquestas</span>
                </h2>
                <p className="text-white/80 mt-2">
                    Agrega información de contacto y redes sociales de las orquestas
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Name Field with Suggestions */}
                <FloatingLabelInput
                    id="orchName"
                    label="Nombre de la Orquesta/Grupo"
                    value={formData.name}
                    onChange={handleNameInput}
                    icon={<Music className="h-5 w-5" />}
                    suggestions={suggestions.filter(s =>
                        s.toLowerCase().includes(formData.name.toLowerCase())
                    )}
                    showSuggestions={showSuggestions}
                    onSuggestionClick={selectOrchestra}
                    inputRef={nameInputRef}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FloatingLabelInput
                        id="orchPhone"
                        label="Número de Teléfono"
                        value={formData.phone}
                        onChange={(v) => setFormData({ ...formData, phone: v })}
                        type="tel"
                        icon={<Phone className="h-5 w-5" />}
                    />

                    <FloatingLabelInput
                        id="orchFacebook"
                        label="Facebook"
                        value={formData.facebook}
                        onChange={(v) => setFormData({ ...formData, facebook: v })}
                        icon={<Globe className="h-5 w-5" />}
                        placeholder="Enlace o nombre de usuario"
                    />

                    <FloatingLabelInput
                        id="orchInstagram"
                        label="Instagram"
                        value={formData.instagram}
                        onChange={(v) => setFormData({ ...formData, instagram: v })}
                        icon={<Globe className="h-5 w-5" />}
                        placeholder="Enlace o nombre de usuario"
                    />

                    <FloatingLabelInput
                        id="orchOther"
                        label="Otros datos"
                        value={formData.other}
                        onChange={(v) => setFormData({ ...formData, other: v })}
                        icon={<FileText className="h-5 w-5" />}
                    />
                </div>

                {/* Messages */}
                {errorMessage && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <p>{errorMessage}</p>
                    </div>
                )}

                {successMessage && (
                    <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl border border-green-200">
                        <CheckCircle className="h-5 w-5 flex-shrink-0" />
                        <p>{successMessage}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className={`
            w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg
            transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
            flex items-center justify-center gap-2
            ${isLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-cyan-500/30'
                        }
          `}
                >
                    {isLoading ? (
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Save className="h-5 w-5" />
                            <span>Guardar Datos</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
