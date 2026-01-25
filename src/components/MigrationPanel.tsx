import React, { useState } from 'react';
import { Loader2, Download, Trash2, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import autoMigrationService from '../services/autoMigrationService';
import hybridDataService from '../services/hybridDataService';
import { Event } from '../types/event';

interface MigrationResult {
  success: boolean;
  year: number;
  eventsMigrated: number;
  eventsDeleted: number;
  error?: string;
  timestamp: string;
}

export default function MigrationPanel() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archivesExist, setArchivesExist] = useState<{ [key: number]: boolean }>({});

  const analyzeCurrentState = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { analyzeEventsByYear } = await import('../scripts/analyzeEvents');
      const result = await analyzeEventsByYear();
      setAnalysis(result);

      // Verificar qué archivos estáticos ya existen
      const { staticFileService } = await import('../services/staticFileService');
      const currentYear = new Date().getFullYear();
      const years = Object.keys(result.eventsByYear).map(Number);

      const existence: { [key: number]: boolean } = {};
      for (const year of years) {
        if (year < currentYear) {
          existence[year] = await staticFileService.archiveExists(year);
        }
      }
      setArchivesExist(existence);
    } catch (error) {
      setError('Error al analizar el estado actual: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeManualMigration = async (year: number) => {
    setIsMigrating(true);
    setError(null);
    setMigrationResult(null);

    try {
      // Paso 1: Extraer eventos y crear archivo JSON
      const { analyzeEventsByYear } = await import('../scripts/analyzeEvents');
      const analysisData = await analyzeEventsByYear();
      const yearEvents = analysisData.eventsByYear[year.toString()] || [];

      if (yearEvents.length === 0) {
        setError(`No hay eventos para migrar del año ${year}`);
        return;
      }

      // Paso 2: Crear archivo JSON usando el servicio estático
      const { staticFileService } = await import('../services/staticFileService');
      const archiveData = {
        year,
        totalEvents: yearEvents.length,
        events: yearEvents,
        exportDate: new Date().toISOString(),
        migratedFromFirebase: true,
        migrationVersion: '1.0'
      };

      const createResult = await staticFileService.createArchiveFile(archiveData);

      if (!createResult.success) {
        throw new Error(`Error al crear archivo JSON: ${createResult.error}`);
      }

      // Paso 3: Eliminar eventos de Firebase (con autenticación)
      const deleteCount = await deleteEventsFromFirebase(year, yearEvents);

      const result: MigrationResult = {
        success: true,
        year,
        eventsMigrated: yearEvents.length,
        eventsDeleted: deleteCount,
        timestamp: new Date().toISOString()
      };

      setMigrationResult(result);

      if (result.success) {
        // Actualizar el análisis después de la migración
        await analyzeCurrentState();
      }

    } catch (error) {
      setError('Error al ejecutar migración: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsMigrating(false);
    }
  };

  const deleteEventsFromFirebase = async (year: number, events: any[]): Promise<number> => {
    const { ref, remove } = await import('firebase/database');
    const { db } = await import('../lib/firebase');

    let deletedCount = 0;

    // Si no se pasaron eventos, intentamos obtenerlos del análisis si existe
    let eventsToDelete = events;
    if (!eventsToDelete || eventsToDelete.length === 0) {
      if (analysis && analysis.eventsByYear[year.toString()]) {
        eventsToDelete = analysis.eventsByYear[year.toString()];
      } else {
        // Si no los tenemos, los buscamos de Firebase primero
        const { get } = await import('firebase/database');
        const snapshot = await get(ref(db, 'events'));
        if (snapshot.exists()) {
          const allEvents = snapshot.val();
          eventsToDelete = Object.entries(allEvents)
            .map(([id, data]: [string, any]) => ({ id, ...data }))
            .filter((e: any) => new Date(e.day).getFullYear() === year);
        }
      }
    }

    if (!eventsToDelete || eventsToDelete.length === 0) {
      return 0;
    }

    for (const event of eventsToDelete) {
      try {
        await remove(ref(db, `events/${event.id}`));
        deletedCount++;
      } catch (error) {
        console.error(`Error al eliminar evento ${event.id}:`, error);
      }
    }

    return deletedCount;
  };

  const handleOnlyDelete = async (year: number) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar DEFINITIVAMENTE los eventos del año ${year} de Firebase? Esta acción no se puede deshacer y solo debe hacerse si ya existe el archivo estático.`)) {
      return;
    }

    setIsMigrating(true);
    setError(null);
    setMigrationResult(null);

    try {
      const deleteCount = await deleteEventsFromFirebase(year, []);

      setMigrationResult({
        success: true,
        year,
        eventsMigrated: 0,
        eventsDeleted: deleteCount,
        timestamp: new Date().toISOString()
      });

      await analyzeCurrentState();
    } catch (error) {
      setError('Error al eliminar eventos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsMigrating(false);
    }
  };

  const scheduleAutomaticMigration = () => {
    alert('La migración automática está configurada en GitHub Actions para el 1 de enero a las 00:00h. No requiere acción manual.');
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Panel de Migración de Eventos</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Optimización de Firebase moviendo eventos de años anteriores a archivos JSON estáticos.
          <span className="ml-1 font-medium text-indigo-600">Gestionado automáticamente por GitHub Actions.</span>
        </p>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={analyzeCurrentState}
              disabled={isAnalyzing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Analizar Estado Actual
                </>
              )}
            </button>

            <button
              onClick={scheduleAutomaticMigration}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Info Migración GitHub
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex gap-3 items-start">
            <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Automatización Activa</p>
              <p className="text-xs text-blue-700 mt-1">
                GitHub Actions ejecutará la migración el 1 de enero a las 00:00h automáticamente.
                También puedes lanzarla manualmente desde el panel de GitHub ("Workflow Dispatch").
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {migrationResult && (
            <div className={`border rounded-md p-4 ${migrationResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
              }`}>
              <div className="flex">
                {migrationResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                )}
                <div className="ml-3">
                  <p className={`text-sm ${migrationResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                    {migrationResult.success
                      ? `✅ Migración completada: ${migrationResult.eventsMigrated} eventos migrados del año ${migrationResult.year}`
                      : `❌ Migración fallida: ${migrationResult.error}`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Estado Actual de Eventos</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-base font-medium text-gray-900 mb-3">Resumen General</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total de eventos:</span>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {analysis.totalEvents}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Año actual:</span>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {currentYear}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Años con datos:</span>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {Object.keys(analysis.eventsByYear).length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-base font-medium text-gray-900 mb-3">Distribución por Año</h4>
                  <div className="space-y-2 text-sm">
                    {Object.keys(analysis.eventsByYear)
                      .sort()
                      .map(year => {
                        const isCurrentYear = year === currentYear.toString();
                        const count = analysis.eventsByYear[year].length;
                        return (
                          <div key={year} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">{year}</span>
                              {archivesExist[parseInt(year)] && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 uppercase tracking-tight">
                                  JSON Existe
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isCurrentYear
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                                  }`}
                              >
                                {count} eventos
                              </span>
                              {!isCurrentYear && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => executeManualMigration(parseInt(year))}
                                    disabled={isMigrating}
                                    className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all disabled:opacity-50"
                                    title="Crear JSON y borrar de Firebase"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOnlyDelete(parseInt(year))}
                                    disabled={isMigrating || !archivesExist[parseInt(year)]}
                                    className={`p-1 rounded transition-all ${archivesExist[parseInt(year)]
                                      ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                                      : "text-gray-300 cursor-not-allowed"
                                      }`}
                                    title={archivesExist[parseInt(year)] ? "Borrar de Firebase (Requiere JSON)" : "Primero crea el archivo JSON"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-base font-medium text-gray-900 mb-3">Acciones de Migración</h4>
                {analysis.previousYears.map((year: number) => {
                  const hasArchive = archivesExist[year];
                  return (
                    <div key={year} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => executeManualMigration(year)}
                        disabled={isMigrating}
                        className="flex items-center justify-between px-4 py-2 border border-indigo-200 rounded-md text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          <span>Migrar año {year}</span>
                        </div>
                        <span className="text-xs bg-white px-1.5 rounded border border-indigo-100">
                          {analysis.eventsByYear[year].length} ev.
                        </span>
                      </button>

                      <button
                        onClick={() => handleOnlyDelete(year)}
                        disabled={isMigrating || !hasArchive}
                        className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-md text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${hasArchive
                          ? "border-red-200 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500"
                          : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                          }`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Borrar de Firebase</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}