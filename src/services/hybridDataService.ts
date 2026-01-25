import { ref, onValue, get, remove, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event } from '../types/event';

export interface ArchivedEventData {
  year: number;
  totalEvents: number;
  events: Event[];
  exportDate: string;
  migratedFromFirebase: boolean;
}

class HybridDataService {
  private currentYear: string;
  private archiveBaseUrl = '/events-archive';

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

      // Obtener eventos de años anteriores desde archivos JSON
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

      // Cancelar la suscripción después de obtener los datos
      setTimeout(() => {
        unsubscribe();
      }, 1000);
    });
  }

  /**
   * Obtiene eventos de años anteriores desde archivos JSON estáticos
   */
  async getPreviousYearsEventsFromJSON(): Promise<Event[]> {
    try {
      const events: Event[] = [];
      const currentYearNum = parseInt(this.currentYear);

      // Obtener lista de años disponibles (podría ser dinámico)
      const availableYears = await this.getAvailableArchiveYears();

      for (const year of availableYears) {
        if (year < currentYearNum) {
          const yearEvents = await this.getEventsFromYearFile(year);
          events.push(...yearEvents);
        }
      }

      return events;
    } catch (error) {
      console.error('Error al obtener eventos de archivos JSON:', error);
      return [];
    }
  }

  /**
   * Carga eventos de un archivo JSON específico de un año
   */
  async getEventsFromYearFile(year: number): Promise<Event[]> {
    try {
      const response = await fetch(`${this.archiveBaseUrl}/${year}.json`);

      if (!response.ok) {
        console.warn(`No se encontró archivo para el año ${year}`);
        return [];
      }

      const data: ArchivedEventData = await response.json();
      return data.events || [];
    } catch (error) {
      console.error(`Error al cargar eventos del año ${year}:`, error);
      return [];
    }
  }

  /**
   * Obtiene la lista de años disponibles en el archivo de históricos
   */
  async getAvailableArchiveYears(): Promise<number[]> {
    try {
      // Importar dinámicamente para evitar dependencias circulares si las hubiera
      const { staticFileService } = await import('./staticFileService');
      return await staticFileService.getAvailableYears();
    } catch (error) {
      console.error('Error al obtener años disponibles desde staticFileService:', error);
      // Fallback a lógica manual si falla
      const currentYear = new Date().getFullYear();
      const years: number[] = [];
      for (let year = 2020; year < currentYear; year++) {
        years.push(year);
      }
      return years;
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