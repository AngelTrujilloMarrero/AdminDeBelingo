import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, Download, X, Check, MapPin, Clock, Music2 } from 'lucide-react';
import { Event } from '../types/event';

interface CustomExportProps {
  events: Event[];
  onClose: () => void;
}

const CustomExport: React.FC<CustomExportProps> = ({ events, onClose }) => {
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('');
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  // Get unique municipalities from events
  const municipios = useMemo(() => {
    const uniqueMunicipios = [...new Set(events.map(event => event.municipio))];
    return uniqueMunicipios.sort();
  }, [events]);

  // Filter events by selected municipality
  const municipioEvents = useMemo(() => {
    if (!selectedMunicipio) return [];
    return events.filter(event => event.municipio === selectedMunicipio);
  }, [events, selectedMunicipio]);

  // Group events by day for better organization
  const eventsByDay = useMemo(() => {
    const grouped: { [key: string]: Event[] } = {};
    municipioEvents.forEach(event => {
      if (!grouped[event.day]) {
        grouped[event.day] = [];
      }
      grouped[event.day].push(event);
    });
    return grouped;
  }, [municipioEvents]);

  const handleEventToggle = (eventId: string) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allEventIds = municipioEvents.map(event => event.id);
    setSelectedEvents(new Set(allEventIds));
  };

  const handleDeselectAll = () => {
    setSelectedEvents(new Set());
  };

  const generateCustomImage = useCallback(async () => {
    if (selectedEvents.size === 0) {
      alert('Por favor selecciona al menos un evento');
      return;
    }

    setIsGenerating(true);

    try {
      // Get selected events data
      const selectedEventsData = events.filter(event => selectedEvents.has(event.id));
      
      // Sort events by date and time
      selectedEventsData.sort((a, b) => {
        const dateA = new Date(`${a.day}T${a.hora}`);
        const dateB = new Date(`${b.day}T${b.hora}`);
        return dateA.getTime() - dateB.getTime();
      });

      // Create the image generation logic similar to WEB debelingo but customized
      await generateImage(selectedEventsData, selectedMunicipio);
      
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Error al generar la imagen. Por favor inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedEvents, events, selectedMunicipio]);

  const generateImage = async (eventsData: Event[], municipio: string) => {
    // Create temporary container for image generation
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
      max-width: 1200px;
      position: absolute;
      top: -9999px;
      left: -9999px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    `;

    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = `
      position: relative;
      z-index: 10;
      background-color: rgba(255, 255, 255, 0.9);
      border: 3px solid #000000;
      padding: 30px;
      border-radius: 15px;
      max-width: 95%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      width: 98%;
      margin-left: 1%;
      margin-right: 1%;
      margin-bottom: 20px;
      margin-top: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;

    // Add generation date
    const generationDate = document.createElement('p');
    generationDate.style.cssText = `
      font-size: 0.9em;
      color: #666666;
      margin-bottom: 10px;
      font-family: Arial, sans-serif;
    `;
    generationDate.textContent = `Generado ${new Date().toLocaleString('es-ES')}`;
    contentDiv.appendChild(generationDate);

    // Create header with custom title
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: bold;
      margin-bottom: 30px;
      font-family: Impact, sans-serif;
      text-shadow: 3px 3px 0px rgba(0,0,0,0.8);
      border: 4px solid #ffffff;
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
      padding: 25px 50px;
      border-radius: 50px;
      box-shadow: 10px 10px 20px rgba(0,0,0,0.4);
      width: auto;
      max-width: 90%;
      letter-spacing: 2px;
      line-height: 1.2;
      text-align: center;
    `;

    const titleLine = document.createElement('div');
    titleLine.textContent = `VERBENAS ${municipio.toUpperCase()}`;
    titleLine.style.cssText = `
      font-size: 3em;
      white-space: nowrap;
      margin-bottom: 10px;
    `;

    const subtitleLine = document.createElement('div');
    subtitleLine.textContent = 'Selección Personalizada';
    subtitleLine.style.cssText = `
      font-size: 1.8em;
      white-space: nowrap;
      opacity: 0.9;
    `;

    headerDiv.appendChild(titleLine);
    headerDiv.appendChild(subtitleLine);
    contentDiv.appendChild(headerDiv);

    // Group events by day
    const eventsByDayForImage: { [key: string]: Event[] } = {};
    eventsData.forEach(event => {
      if (!eventsByDayForImage[event.day]) {
        eventsByDayForImage[event.day] = [];
      }
      eventsByDayForImage[event.day].push(event);
    });

    // Create events container
    const eventsContainer = document.createElement('div');
    eventsContainer.style.width = '100%';
    eventsContainer.style.margin = '0 auto';

    // Process each day
    Object.keys(eventsByDayForImage).sort().forEach(dayKey => {
      const dayEvents = eventsByDayForImage[dayKey];
      const dayDate = new Date(dayKey);
      const dayName = dayDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).toUpperCase();

      // Day header
      const dayHeader = document.createElement('h3');
      dayHeader.textContent = dayName;
      dayHeader.style.cssText = `
        color: #2c3e50;
        font-weight: bold;
        text-decoration: underline;
        text-decoration-color: #e74c3c;
        text-decoration-thickness: 3px;
        margin-bottom: 15px;
        margin-top: 20px;
        font-size: 2.2em;
        font-family: Impact, sans-serif;
        text-shadow: 2px 2px 0px #f39c12;
        text-align: center;
      `;
      eventsContainer.appendChild(dayHeader);

      // Events for this day
      dayEvents.forEach(event => {
        const eventDiv = document.createElement('div');
        eventDiv.style.cssText = `
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border: 2px solid #495057;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 10px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        `;

        let eventHTML = `
          <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <span style="font-size: 1.4em; color: #e74c3c; font-weight: bold;">${event.hora}H</span>
        `;

        if (event.tipo && event.tipo !== 'Baile Normal') {
          eventHTML += `
            <span style="font-size: 1.2em; color: #8e44ad; font-weight: bold; background: rgba(142, 68, 173, 0.1); padding: 5px 10px; border-radius: 5px;">${event.tipo}</span>
          `;
        }

        eventHTML += `
            <span style="font-size: 1.3em; color: #2c3e50; font-weight: bold; flex: 1;">${event.orquesta}</span>
          </div>
        `;

        if (event.lugar) {
          eventHTML += `
            <div style="margin-top: 8px; font-size: 1.1em; color: #7f8c8d; display: flex; align-items: center; gap: 5px;">
              <span>📍</span> ${event.lugar}
            </div>
          `;
        }

        eventDiv.innerHTML = eventHTML;
        eventsContainer.appendChild(eventDiv);
      });
    });

    contentDiv.appendChild(eventsContainer);

    // Add footer info
    const footerInfo = document.createElement('div');
    footerInfo.style.cssText = `
      margin-top: 25px;
      padding: 15px;
      background: rgba(231, 76, 60, 0.1);
      border: 2px solid #e74c3c;
      border-radius: 10px;
      text-align: center;
    `;

    const infoText = document.createElement('p');
    infoText.style.cssText = `
      font-size: 1.5em;
      color: #c0392b;
      font-weight: bold;
      font-family: Arial, sans-serif;
      margin: 0;
    `;
    infoText.textContent = 'Más info en: https://debelingoconangel.web.app';
    footerInfo.appendChild(infoText);

    tempContainer.appendChild(contentDiv);
    tempContainer.appendChild(footerInfo);
    document.body.appendChild(tempContainer);

    // Wait for layout to settle
    setTimeout(() => {
      // Import html2canvas dynamically
      import('html2canvas').then(({ default: html2canvas }) => {
        const finalHeight = Math.max(1200, tempContainer.scrollHeight);
        
        html2canvas(tempContainer, {
          width: 1200,
          height: finalHeight,
          windowHeight: finalHeight,
          backgroundColor: null,
          useCORS: true,
          scale: 1
        }).then(canvas => {
          const dataURL = canvas.toDataURL('image/png', 0.9);
          
          // Download the image
          const link = document.createElement('a');
          link.download = `verbenas_${municipio.toLowerCase()}_personalizadas_${new Date().toISOString().split('T')[0]}.png`;
          link.href = dataURL;
          link.click();
          
          // Clean up
          document.body.removeChild(tempContainer);
        }).catch(err => {
          console.error("Error generating image with html2canvas:", err);
          alert("Hubo un error al generar la imagen. Por favor, inténtalo de nuevo.");
          document.body.removeChild(tempContainer);
        });
      }).catch(err => {
        console.error("Error loading html2canvas:", err);
        alert("No se pudo cargar la librería para generar imágenes.");
        document.body.removeChild(tempContainer);
      });
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Download className="w-6 h-6" />
              Exportar Cartel Personalizado
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Municipio Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Selecciona un municipio:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {municipios.map(municipio => (
                <button
                  key={municipio}
                  onClick={() => {
                    setSelectedMunicipio(municipio);
                    setSelectedEvents(new Set());
                  }}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedMunicipio === municipio
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {municipio}
                </button>
              ))}
            </div>
          </div>

          {/* Events Selection */}
          {selectedMunicipio && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  Selecciona eventos de {selectedMunicipio}:
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    Deseleccionar todos
                  </button>
                </div>
              </div>

              {Object.keys(eventsByDay).sort().map(dayKey => {
                const dayEvents = eventsByDay[dayKey];
                const dayDate = new Date(dayKey);
                const dayName = dayDate.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                });

                return (
                  <div key={dayKey} className="mb-6">
                    <h4 className="font-semibold text-gray-600 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {dayName}
                    </h4>
                    <div className="space-y-2">
                      {dayEvents.map(event => (
                        <div
                          key={event.id}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedEvents.has(event.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                          onClick={() => handleEventToggle(event.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                selectedEvents.has(event.id)
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {selectedEvents.has(event.id) && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-blue-600 font-semibold">
                                <Clock className="w-4 h-4" />
                                <span>{event.hora}H</span>
                              </div>
                              {event.tipo && event.tipo !== 'Baile Normal' && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                                  {event.tipo}
                                </span>
                              )}
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="w-4 h-4" />
                                <span>{event.lugar || 'Sin lugar especificado'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-green-600 font-semibold">
                              <Music2 className="w-4 h-4" />
                              <span>{event.orquesta}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Generate Button */}
          {selectedMunicipio && (
            <div className="flex justify-center">
              <button
                onClick={generateCustomImage}
                disabled={selectedEvents.size === 0 || isGenerating}
                className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-3 ${
                  selectedEvents.size === 0 || isGenerating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                }`}
              >
                <Download className="w-5 h-5" />
                {isGenerating ? 'Generando...' : `Generar Cartel (${selectedEvents.size} eventos)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomExport;