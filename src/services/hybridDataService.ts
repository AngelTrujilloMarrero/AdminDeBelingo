import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event } from '../types/event';
import { staticFileService } from './staticFileService';

class HybridDataService {
  private currentYear: string;

  constructor() {
    this.currentYear = new Date().getFullYear().toString();
  }

  /**
   * Obtiene eventos combinados de Firebase (en vivo) y archivos JSON (archivados)
   */
  async getAllEvents(): Promise<Event[]> {
    try {
      // 1. Obtener eventos en vivo desde Firebase
      const liveEvents = await this.getLiveEventsFromFirebase();

      // 2. Obtener eventos archivados desde archivos JSON
      const archivedEvents = await this.getPreviousYearsEventsFromJSON();

      // Combinar todos los eventos y eliminar duplicados por ID
      const allEventsMap = new Map<string, Event>();
      
      // Los eventos de Firebase (en vivo) tienen prioridad si hay solapamiento
      archivedEvents.forEach(event => allEventsMap.set(event.id, event));
      liveEvents.forEach(event => allEventsMap.set(event.id, event));

      return Array.from(allEventsMap.values());
    } catch (error) {
      console.error('Error en getAllEvents:', error);
      return [];
    }
  }

  /**
   * Obtiene todos los eventos guardados en Firebase (datos "vivos")
   */
  async getLiveEventsFromFirebase(): Promise<Event[]> {
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
                loadedEvents.push({ id: key, ...value });
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

      // Cancelar la suscripción tras obtener los datos
      setTimeout(() => unsubscribe(), 5000);
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

      // Cargar eventos de cada año disponible
      const fetchPromises = availableYears
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