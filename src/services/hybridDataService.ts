import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event } from '../types/event';
import staticFileService from './staticFileService';

export interface ArchivedEventData {
  year: number;
  totalEvents: number;
  events: Event[];
  exportDate: string;
  migratedFromFirebase: boolean;
}

class HybridDataService {
  private currentYear: string;

  constructor() {
    this.currentYear = new Date().getFullYear().toString();
  }

  /**
   * Obtiene eventos combinados de Firebase (año actual) y archivos JSON (años anteriores)
   */
  async getAllEvents(): Promise<Event[]> {
    try {
      // Obtener eventos del año actual desde Firebase
      const currentYearEvents = await this.getCurrentYearEventsFromFirebase();

      // Obtener eventos de años anteriores desde archivos JSON en Storage
      const previousYearsEvents = await this.getPreviousYearsEventsFromJSON();

      // Combinar todos los eventos
      return [...currentYearEvents, ...previousYearsEvents];
    } catch (error) {
      console.error('Error en getAllEvents:', error);
      return [];
    }
  }

  /**
   * Obtiene eventos del año actual desde Firebase
   */
  async getCurrentYearEventsFromFirebase(): Promise<Event[]> {
    return new Promise((resolve, reject) => {
      const eventsRef = ref(db, 'events');
      const unsubscribe = onValue(
        eventsRef,
        (snapshot) => {
          try {
            const loadedEvents: Event[] = [];
            const data = snapshot.val();

            if (data) {
              Object.entries(data).forEach(([key, value]: [string, any]) => {
                const event = { id: key, ...value };
                // Solo incluir eventos del año actual
                if (new Date(event.day).getFullYear().toString() === this.currentYear) {
                  loadedEvents.push(event);
                }
              });
            }

            resolve(loadedEvents);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          reject(error);
        }
      );

      // Cancelar la suscripción después de obtener los datos (o tras un timeout)
      setTimeout(() => {
        unsubscribe();
      }, 2000);
    });
  }

  /**
   * Obtiene eventos de años anteriores desde archivos JSON estáticos en Storage
   */
  async getPreviousYearsEventsFromJSON(): Promise<Event[]> {
    try {
      const events: Event[] = [];
      const currentYearNum = parseInt(this.currentYear);

      // Obtener lista de años disponibles desde el servicio estático
      const availableYears = await staticFileService.getAvailableYears();

      // Cargar eventos de cada año disponible que sea anterior al actual
      const fetchPromises = availableYears
        .filter(year => year < currentYearNum)
        .map(async (year) => {
          const archiveData = await staticFileService.getArchiveData(year);
          return archiveData ? archiveData.events : [];
        });

      const results = await Promise.all(fetchPromises);
      results.forEach(yearEvents => events.push(...yearEvents));

      return events;
    } catch (error) {
      console.error('Error al obtener eventos de archivos JSON:', error);
      return [];
    }
  }

  /**
   * Filtra eventos por rango de años específico
   */
  async getEventsByYearRange(startYear: number, endYear: number): Promise<Event[]> {
    const allEvents = await this.getAllEvents();

    return allEvents.filter(event => {
      const eventYear = new Date(event.day).getFullYear();
      return eventYear >= startYear && eventYear <= endYear;
    });
  }

  /**
   * Obtiene eventos de un año específico
   */
  async getEventsByYear(year: number): Promise<Event[]> {
    const allEvents = await this.getAllEvents();

    return allEvents.filter(event => {
      const eventYear = new Date(event.day).getFullYear();
      return eventYear === year;
    });
  }

  /**
   * Actualiza el año actual (útil para pruebas o transiciones)
   */
  setCurrentYear(year: string): void {
    this.currentYear = year;
  }

  /**
   * Obtiene el año actual configurado
   */
  getCurrentYear(): string {
    return this.currentYear;
  }

  /**
   * Verifica si un año debe cargarse desde Firebase o JSON
   */
  isCurrentYear(year: number): boolean {
    return year.toString() === this.currentYear;
  }
}

// Exportar instancia singleton
export const hybridDataService = new HybridDataService();
export default hybridDataService;