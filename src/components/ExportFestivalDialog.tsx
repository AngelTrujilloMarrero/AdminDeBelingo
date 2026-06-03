import React, { useState, useEffect, useMemo } from 'react';
import { Event } from '../types/event';
import { Download, X, Check, FileImage, Calendar, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { ref, push, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

interface ExportFestivalDialogProps {
    events: Event[];
    onClose: () => void;
}

export default function ExportFestivalDialog({ events, onClose }: ExportFestivalDialogProps) {
    const [selectedMunicipio, setSelectedMunicipio] = useState<string>('');
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isSendingToQueue, setIsSendingToQueue] = useState(false);
    const [queueResult, setQueueResult] = useState<{ success: boolean; message: string } | null>(null);
    const [queueCount, setQueueCount] = useState(0);

    // Subscribe to queue count for badge
    useEffect(() => {
        const queueRef = ref(db, 'telegramPhotoQueue');
        const unsubscribe = onValue(queueRef, (snapshot) => {
            const data = snapshot.val();
            setQueueCount(data ? Object.keys(data).length : 0);
        });
        return () => unsubscribe();
    }, []);

    // Get unique municipalities from active events
    const municipalities = useMemo(() => {
        const m = new Set<string>();
        events.forEach(e => {
            if (!e.isArchived && !e.cancelado && e.municipio) {
                m.add(e.municipio);
            }
        });
        return Array.from(m).sort();
    }, [events]);

    // Filter events for selected municipality and within 20 days
    const municipioEvents = useMemo(() => {
        if (!selectedMunicipio) return [];
        
        const twentyDaysAgo = new Date();
        twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
        twentyDaysAgo.setHours(0, 0, 0, 0);

        return events
            .filter(e => {
                const eventDate = new Date(e.day);
                return e.municipio === selectedMunicipio && 
                       !e.isArchived && 
                       !e.cancelado && 
                       eventDate >= twentyDaysAgo;
            })
            .sort((a, b) => new Date(`${a.day}T${a.hora}`).getTime() - new Date(`${b.day}T${b.hora}`).getTime());
    }, [events, selectedMunicipio]);

    // Select all events when municipality changes
    useEffect(() => {
        if (municipioEvents.length > 0) {
            setSelectedEventIds(new Set(municipioEvents.map(e => e.id)));
        } else {
            setSelectedEventIds(new Set());
        }
    }, [municipioEvents]);

    const toggleEvent = (id: string) => {
        const newSet = new Set(selectedEventIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedEventIds(newSet);
    };

    const toggleAll = () => {
        if (selectedEventIds.size === municipioEvents.length) {
            setSelectedEventIds(new Set());
        } else {
            setSelectedEventIds(new Set(municipioEvents.map(e => e.id)));
        }
    };

    const generateImage = async () => {
        if (selectedEventIds.size === 0) {
            alert("Selecciona al menos un evento.");
            return;
        }
    
        setIsGenerating(true);
    
        const selectedEvents = municipioEvents.filter(e => selectedEventIds.has(e.id));
        const lugar = selectedEvents[0]?.lugar || ''; // Use first event's place as main place if needed
        const municipio = selectedMunicipio;
    
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
            width: 1200px;
            min-height: 1200px;
            position: relative;
            padding: 20px;
            text-align: center;
            margin: 0 auto;
            border-radius: 10px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: absolute;
            top: -9999px;
            left: -9999px;
            background-color: white; /* Default background */
        `;
    
        const backgroundDiv = document.createElement('div');
        backgroundDiv.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            opacity: 0.75;
        `;
    
        // Logic to find background image (simplified from WEB debelingo)
        // We'll try to find an image, or fallback to white/gradient
        // For Admin, we might not have easy access to the exact same image logic if it depends on external URLs 
        // that might require CORS or specific hosting. 
        // We will try the same URLs as WEB debelingo.
        
        const generateImageUrls = () => {
            const urls: string[] = [];
            const baseUrls = [
                'https://debelingoconangel.web.app/fotos/'
            ];
            const extensions = ['jpg', 'jpeg', 'png', 'webp'];
            const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');
    
            const variations: string[] = [];
            const addVariations = (text: string) => {
                if (!text) return;
                const norm = normalize(text);
                variations.push(norm.replace(/\s+/g, ''));
                if (text.includes(' ')) {
                    variations.push(norm.replace(/\s+/g, '-'));
                    variations.push(norm.replace(/\s+/g, '_'));
                }
            };
    
            addVariations(municipio);
    
            const uniqueVariations = [...new Set(variations)];
            for (const base of baseUrls) {
                for (const variant of uniqueVariations) {
                    for (const ext of extensions) {
                        urls.push(`${base}${variant}.${ext}`);
                    }
                }
            }
            return urls;
        };
    
        const possibleImages = generateImageUrls();
        
        const createContent = () => {
            const contentDiv = document.createElement('div');
            contentDiv.style.cssText = `
                position: relative;
                z-index: 10;
                background-color: rgba(255, 255, 255, 0.4);
                border: 1px solid #000000;
                padding: 40px;
                border-radius: 15px;
                max-width: 98%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                box-sizing: border-box;
                width: 98%;
                margin: 10px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            `;
    
            const generationDate = document.createElement('p');
            generationDate.style.cssText = `
                font-size: 0.9em;
                color: #555;
                margin-bottom: 10px;
                font-family: Arial, sans-serif;
                align-self: flex-end;
            `;
            generationDate.textContent = `Generado ${new Date().toLocaleString('es-ES')}`;
            contentDiv.appendChild(generationDate);
    
            const festivalHeader = document.createElement('div');
            const randomHue = Math.floor(Math.random() * 360);
            const randomBgColor = `hsla(${randomHue}, 70%, 50%, 0.9)`;
    
            festivalHeader.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-weight: bold;
                margin-bottom: 40px;
                font-family: Impact, sans-serif;
                text-shadow: 4px 4px 0px rgba(0,0,0,0.8);
                border: 6px solid #ffffff;
                background: ${randomBgColor};
                padding: 30px 60px;
                border-radius: 50px;
                box-shadow: 0 15px 30px rgba(0,0,0,0.4), inset 0 0 60px rgba(255,255,255,0.3);
                width: auto;
                max-width: 100%;
                letter-spacing: 2px;
                line-height: 1.2;
                text-align: center;
                transform: none;
            `;
    
            const createHeaderLine = (text: string, baseSize: number) => {
                const line = document.createElement('div');
                line.textContent = text;
                line.style.whiteSpace = 'nowrap';
                line.style.fontSize = `${baseSize}em`;
                return line;
            };
    
            // Titular personalizado: "Verbenas [Municipio]"
            festivalHeader.appendChild(createHeaderLine(`VERBENAS ${municipio.toUpperCase()}`, 5.0));
            // Optional: Add Lugar if it's consistent across selected events? 
            // For now, simpler is better as per request "Verbenas Municipio Correspondiente"
            
            contentDiv.appendChild(festivalHeader);
    
            const eventsContainer = document.createElement('div');
            eventsContainer.style.width = '100%';
            eventsContainer.style.margin = '0 auto';
    
            const eventsByDay: { [key: string]: Event[] } = {};
            selectedEvents.forEach(event => {
                const dayKey = new Date(event.day).toISOString().split('T')[0];
                if (!eventsByDay[dayKey]) eventsByDay[dayKey] = [];
                eventsByDay[dayKey].push(event);
            });
    
            const dayKeys = Object.keys(eventsByDay).sort();
            const COLUMN_THRESHOLD = 8;
            const totalEvents = selectedEvents.length;

            if (totalEvents >= COLUMN_THRESHOLD) {
                eventsContainer.style.columnCount = '2';
                eventsContainer.style.columnGap = '40px';
                eventsContainer.style.columnFill = 'balance';
                eventsContainer.style.columnRule = '1px solid #ccc';
            }
    
            dayKeys.forEach(dayKey => {
                const dayEvents = eventsByDay[dayKey];
                const dayDate = new Date(dayKey);
                const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    
                const daySection = document.createElement('div');
                daySection.style.breakInside = 'avoid';
                daySection.style.marginBottom = '15px';
    
                const dayHeader = document.createElement('h3');
                dayHeader.textContent = dayName;
                dayHeader.style.cssText = `
                    color: #006400;
                    font-weight: bold;
                    text-decoration: underline;
                    text-decoration-color: #006400;
                    margin-bottom: 12px;
                    font-size: 2.5em;
                    font-family: Impact, sans-serif;
                    text-shadow: -2px -2px 0 yellow, 2px 2px 0 gold;
                    text-align: center;
                `;
                daySection.appendChild(dayHeader);
    
                dayEvents.forEach(event => {
                    // Match WEB debelingo styles exactly
                    let eventText = `<strong style="font-size: 1.7em; color: blue;">${event.hora}H</strong>|`;
                    
                    if (event.tipo !== 'Baile Normal') {
                        eventText += `<strong style="font-size: 1.7em;">${event.tipo}</strong>|`;
                    }
                    
                    eventText += `<strong style="font-size: 1.7em; color: black; font-family: 'Helvetica Black', 'Arial Black', sans-serif; text-shadow: -2px -2px 0 red, 2px 2px 0 red;">${event.orquesta}</strong>`;
                    
                    if (event.lugar) {
                        eventText += `|<strong style="font-size: 1.5em; color: #000000;">${event.lugar.toUpperCase()}</strong>`;
                    }
    
                    const eventParagraph = document.createElement('p');
                    eventParagraph.innerHTML = eventText;
                    eventParagraph.style.cssText = `
                        color: #000000;
                        margin: 6px 0;
                        font-size: 1.7em;
                        font-family: Impact, sans-serif;
                        text-shadow: -2px -2px 0 yellow, 2px 2px 0 gold;
                        text-align: center;
                    `;
                    daySection.appendChild(eventParagraph);
                });
                eventsContainer.appendChild(daySection);
            });
            
            contentDiv.appendChild(eventsContainer);
    
            const infoText = document.createElement('p');
            infoText.style.cssText = `
                font-size: 2.2em;
                color: #FF0000;
                margin-top: 30px;
                font-family: Arial, sans-serif;
                margin-bottom: 12px;
                font-weight: bold;
            `;
            infoText.innerHTML = 'Más info en: debelingoconangel.web.app';
            contentDiv.appendChild(infoText);
    
            tempContainer.appendChild(backgroundDiv);
            tempContainer.appendChild(contentDiv);
            document.body.appendChild(tempContainer);
    
            // Wait for images and fonts
            setTimeout(() => {
                 // Dynamic scaling
                 const minHeight = 1200;
                 tempContainer.style.height = 'auto';
                 const contentHeight = contentDiv.scrollHeight + 100;
                 
                 let fontSizeMultiplier = 1;
                 if (contentHeight < minHeight) {
                      // Scale up if too small
                      fontSizeMultiplier = Math.min(minHeight / contentHeight, 1.5);
                 }
                 
                 // Apply scaling to main headers
                 Array.from(festivalHeader.children).forEach((line) => {
                    const el = line as HTMLElement;
                    let currentFontSize = parseFloat(el.style.fontSize);
                    currentFontSize *= fontSizeMultiplier;
                    el.style.fontSize = `${currentFontSize}em`;
                 });
    
                 html2canvas(tempContainer, {
                    width: 1200,
                    height: Math.max(minHeight, tempContainer.scrollHeight),
                    windowHeight: Math.max(minHeight, tempContainer.scrollHeight),
                    backgroundColor: null,
                    useCORS: true,
                    scale: 1,
                    logging: false
                }).then(canvas => {
                    // Opción 4: Compresión Adaptativa
                    // Calidad dinámica según altura del canvas
                    const finalHeight = Math.max(minHeight, tempContainer.scrollHeight);
                    let quality = 0.85; // Calidad base 85%
                    
                    if (finalHeight > 2000) {
                        quality = 0.65;  // Canvas muy alto: calidad 65%
                    } else if (finalHeight > 1500) {
                        quality = 0.75;  // Canvas alto: calidad 75%
                    } else if (finalHeight < 800) {
                        quality = 0.90;  // Canvas pequeño: calidad 90%
                    }
                    
                    const dataURL = canvas.toDataURL('image/jpeg', quality);
                    setGeneratedImage(dataURL);
                    document.body.removeChild(tempContainer);
                    setIsGenerating(false);
                }).catch(err => {
                    console.error("Error generating image:", err);
                    alert("Error al generar la imagen.");
                    document.body.removeChild(tempContainer);
                    setIsGenerating(false);
                });
            }, 1000); // Wait a bit longer for resources
        };
    
        // Try to load background
        const tryNextImage = (index: number) => {
            if (index >= possibleImages.length) {
                backgroundDiv.style.backgroundColor = '#f0f0f0'; // Fallback
                createContent();
                return;
            }
            const img = new Image();
            const timeoutId = setTimeout(() => {
                img.onload = null;
                img.onerror = null;
                tryNextImage(index + 1);
            }, 3000);
            img.src = possibleImages[index];
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                clearTimeout(timeoutId);
                backgroundDiv.style.backgroundImage = `url('${possibleImages[index]}')`;
                createContent();
            };
            img.onerror = () => {
                clearTimeout(timeoutId);
                tryNextImage(index + 1);
            };
        };
    
        tryNextImage(0);
    };

    const downloadImage = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.download = `Verbenas_${selectedMunicipio}_${new Date().getFullYear()}.png`;
        link.href = generatedImage;
        link.click();
    };

    const addToTelegramQueue = async () => {
        if (!selectedMunicipio) return;
        setIsSendingToQueue(true);
        setQueueResult(null);

        try {
            const queueRef = ref(db, 'telegramPhotoQueue');
            await push(queueRef, {
                lugar: '',
                municipio: selectedMunicipio,
                label: selectedMunicipio,
                addedAt: new Date().toISOString()
            });
            setQueueResult({
                success: true,
                message: `"${selectedMunicipio}" añadido a la cola`
            });
        } catch (error: any) {
            setQueueResult({
                success: false,
                message: `Error: ${error.message}`
            });
        } finally {
            setIsSendingToQueue(false);
            setTimeout(() => setQueueResult(null), 4000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileImage className="w-6 h-6" />
                        Exportar Cartel de Fiestas
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Selection Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Step 1: Municipio */}
                        <div className="space-y-4">
                            <label htmlFor="municipio-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                1. Selecciona Municipio
                            </label>
                            <select
                                id="municipio-select"
                                value={selectedMunicipio}
                                onChange={(e) => setSelectedMunicipio(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                            >
                                <option value="">-- Seleccionar --</option>
                                {municipalities.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        {/* Step 2: Events */}
                        <div className="md:col-span-2 space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    2. Selecciona Eventos {selectedMunicipio && `(${selectedEventIds.size}/${municipioEvents.length})`}
                                </label>
                                {selectedMunicipio && (
                                    <button 
                                        onClick={toggleAll}
                                        className="text-xs text-pink-600 dark:text-pink-400 font-medium hover:underline"
                                    >
                                        {selectedEventIds.size === municipioEvents.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                    </button>
                                )}
                            </div>
                            
                            {selectedMunicipio ? (
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 max-h-[300px] overflow-y-auto p-2 space-y-2">
                                    {municipioEvents.map(event => (
                                        <button
                                            type="button"
                                            key={event.id}
                                            onClick={() => toggleEvent(event.id)}
                                            className={`
                                                flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all w-full text-left
                                                ${selectedEventIds.has(event.id) 
                                                    ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800' 
                                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-pink-300'}
                                            `}
                                        >
                                            <div className={`
                                                w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors
                                                ${selectedEventIds.has(event.id) 
                                                    ? 'bg-pink-500 border-pink-500 text-white' 
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
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-3 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(event.day).toLocaleDateString()}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {event.lugar || 'Casco'}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {municipioEvents.length === 0 && (
                                        <p className="text-center text-gray-500 py-4">No hay eventos para este municipio.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="h-[100px] flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                    Selecciona un municipio primero
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="flex justify-center pt-4 border-t border-gray-100 dark:border-gray-700">
                         <button
                            onClick={generateImage}
                            disabled={!selectedMunicipio || selectedEventIds.size === 0 || isGenerating}
                            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <FileImage className="w-5 h-5" />
                                    Generar Cartel
                                </>
                            )}
                        </button>
                    </div>

                    {/* Preview Area */}
                    {generatedImage && (
                        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">Vista Previa</h3>
                            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center">
                                <img 
                                    src={generatedImage} 
                                    alt="Cartel Generado" 
                                    className="max-h-[500px] w-auto shadow-2xl rounded-lg mb-6"
                                />
                                <div className="flex flex-wrap gap-3 justify-center">
                                    <button
                                        onClick={() => setGeneratedImage(null)}
                                        className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        Descartar
                                    </button>
                                    <button
                                        onClick={downloadImage}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all hover:-translate-y-1"
                                    >
                                        <Download className="w-5 h-5" />
                                        Descargar
                                    </button>
                                    <button
                                        onClick={addToTelegramQueue}
                                        disabled={isSendingToQueue}
                                        className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {isSendingToQueue ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Enviar a Cola Telegram
                                                {queueCount > 0 && (
                                                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                                                        {queueCount} en cola
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </button>
                                </div>
                                {queueResult && (
                                    <div className={`
                                        flex items-center justify-center gap-2 mt-3 p-2 rounded-lg text-sm font-medium animate-in fade-in duration-300
                                        ${queueResult.success
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                        }
                                    `}>
                                        {queueResult.success
                                            ? <CheckCircle2 className="w-4 h-4" />
                                            : <AlertCircle className="w-4 h-4" />
                                        }
                                        {queueResult.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
