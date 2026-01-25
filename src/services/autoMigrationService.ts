import { ref, get, remove, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event } from '../types/event';
import hybridDataService from './hybridDataService';

interface MigrationResult {
  success: boolean;
  year: number;
  eventsMigrated: number;
  eventsDeleted: number;
  error?: string;
  timestamp: string;
}

class AutoMigrationService {
  private migrationKey = 'lastMigration';
  
  /**
   * Ejecuta la migración automática al inicio del año
   */
  async executeNewYearMigration(): Promise<MigrationResult> {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    try {
      console.log(`Iniciando migración automática para el año ${previousYear}...`);
      
      // Verificar si ya se realizó la migración este año
      if (await this.wasMigrationExecuted(currentYear)) {
        console.log(`La migración para ${currentYear} ya fue ejecutada anteriormente`);
        return {
          success: true,
          year: previousYear,
          eventsMigrated: 0,
          eventsDeleted: 0,
          timestamp: new Date().toISOString()
        };
      }
      
      // Paso 1: Extraer eventos del año anterior desde Firebase
      const previousYearEvents = await this.extractYearFromFirebase(previousYear);
      
      if (previousYearEvents.length === 0) {
        console.log(`No hay eventos para migrar del año ${previousYear}`);
        await this.markMigrationCompleted(currentYear);
        return {
          success: true,
          year: previousYear,
          eventsMigrated: 0,
          eventsDeleted: 0,
          timestamp: new Date().toISOString()
        };
      }
      
      // Paso 2: Crear archivo JSON para el año anterior
      await this.createYearArchiveFile(previousYear, previousYearEvents);
      
      // Paso 3: Verificar que el archivo se creó correctamente
      const archiveVerification = await this.verifyArchiveFile(previousYear);
      
      if (!archiveVerification) {
        throw new Error(`Error al verificar el archivo de archivo para ${previousYear}`);
      }
      
      // Paso 4: Eliminar eventos del año anterior de Firebase
      const deletedCount = await this.deleteYearFromFirebase(previousYear);
      
      if (deletedCount !== previousYearEvents.length) {
        console.warn(`Advertencia: se eliminaron ${deletedCount} eventos de ${previousYearEvents.length} esperados`);
      }
      
      // Paso 5: Marcar migración como completada
      await this.markMigrationCompleted(currentYear);
      
      console.log(`✅ Migración completada con éxito para ${previousYear}`);
      console.log(`   Eventos migrados: ${previousYearEvents.length}`);
      console.log(`   Eventos eliminados: ${deletedCount}`);
      
      return {
        success: true,
        year: previousYear,
        eventsMigrated: previousYearEvents.length,
        eventsDeleted: deletedCount,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Error en migración automática para ${previousYear}:`, error);
      return {
        success: false,
        year: previousYear,
        eventsMigrated: 0,
        eventsDeleted: 0,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Extrae todos los eventos de un año específico desde Firebase
   */
  private async extractYearFromFirebase(year: number): Promise<Event[]> {
    try {
      const eventsRef = ref(db, 'events');
      const snapshot = await get(eventsRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const data = snapshot.val();
      const yearEvents: Event[] = [];
      
      Object.entries(data).forEach(([key, value]: [string, any]) => {
        const event = { id: key, ...value };
        const eventYear = new Date(event.day).getFullYear();
        
        if (eventYear === year) {
          yearEvents.push(event);
        }
      });
      
      return yearEvents;
    } catch (error) {
      console.error(`Error al extraer eventos del año ${year}:`, error);
      throw error;
    }
  }
  
  /**
   * Crea el archivo JSON de archivo para un año específico
   */
  private async createYearArchiveFile(year: number, events: Event[]): Promise<void> {
    const { staticFileService } = await import('./staticFileService');
    
    const archiveData = {
      year,
      totalEvents: events.length,
      events,
      exportDate: new Date().toISOString(),
      migratedFromFirebase: true,
      migrationVersion: '1.0'
    };
    
    const result = await staticFileService.createArchiveFile(archiveData);
    
    if (!result.success) {
      throw new Error(`Error al crear archivo de archivo: ${result.error}`);
    }
  }
  
  /**
   * Verifica que el archivo de archivo existe y es válido
   */
  private async verifyArchiveFile(year: number): Promise<boolean> {
    try {
      const response = await fetch(`/events-archive/${year}.json`);
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      
      // Verificar estructura básica
      return (
        data.year === year &&
        Array.isArray(data.events) &&
        data.events.length > 0
      );
    } catch (error) {
      console.error(`Error al verificar archivo de ${year}:`, error);
      return false;
    }
  }
  
  /**
   * Elimina eventos de un año específico de Firebase
   */
  private async deleteYearFromFirebase(year: number): Promise<number> {
    try {
      const eventsRef = ref(db, 'events');
      const snapshot = await get(eventsRef);
      
      if (!snapshot.exists()) {
        return 0;
      }
      
      const data = snapshot.val();
      const deletePromises: Promise<void>[] = [];
      let deletedCount = 0;
      
      Object.entries(data).forEach(([key, value]: [string, any]) => {
        const event = { id: key, ...value };
        const eventYear = new Date(event.day).getFullYear();
        
        if (eventYear === year) {
          deletePromises.push(remove(ref(db, `events/${key}`)));
          deletedCount++;
        }
      });
      
      await Promise.all(deletePromises);
      return deletedCount;
    } catch (error) {
      console.error(`Error al eliminar eventos del año ${year}:`, error);
      throw error;
    }
  }
  
  /**
   * Verifica si la migración ya fue ejecutada para un año
   */
  private async wasMigrationExecuted(year: number): Promise<boolean> {
    try {
      const migrationRef = ref(db, `migrations/${year}`);
      const snapshot = await get(migrationRef);
      
      return snapshot.exists();
    } catch (error) {
      console.error('Error al verificar estado de migración:', error);
      return false;
    }
  }
  
  /**
   * Marca la migración como completada para un año
   */
  private async markMigrationCompleted(year: number): Promise<void> {
    try {
      const migrationRef = ref(db, `migrations/${year}`);
      await set(migrationRef, {
        completedAt: new Date().toISOString(),
        year,
        status: 'completed'
      });
    } catch (error) {
      console.error('Error al marcar migración como completada:', error);
      throw error;
    }
  }
  
  /**
   * Programa la migración automática para el 1 de enero a las 00:00h
   */
  scheduleNewYearMigration(): void {
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    
    // Calcular tiempo hasta el próximo 1 de enero a las 00:00h
    const nextJanuaryFirst = new Date(nextYear, 0, 1, 0, 0, 0, 0);
    const timeUntilMigration = nextJanuaryFirst.getTime() - now.getTime();
    
    console.log(`Programando migración automática para: ${nextJanuaryFirst.toISOString()}`);
    console.log(`Tiempo restante: ${Math.floor(timeUntilMigration / (1000 * 60 * 60 * 24))} días`);
    
    // Programar la migración
    setTimeout(async () => {
      console.log('🎉 ¡Feliz Año Nuevo! Iniciando migración automática...');
      const result = await this.executeNewYearMigration();
      
      if (result.success) {
        console.log(`✅ Migración automática completada: ${result.eventsMigrated} eventos migrados del año ${result.year}`);
      } else {
        console.error(`❌ Migración automática fallida: ${result.error}`);
      }
      
      // Reprogramar para el próximo año
      this.scheduleNewYearMigration();
      
    }, timeUntilMigration);
  }
  
  /**
   * Ejecuta una migración manual para un año específico
   */
  async executeManualMigration(year: number): Promise<MigrationResult> {
    try {
      console.log(`Iniciando migración manual para el año ${year}...`);
      
      // Extraer eventos
      const yearEvents = await this.extractYearFromFirebase(year);
      
      if (yearEvents.length === 0) {
        return {
          success: true,
          year,
          eventsMigrated: 0,
          eventsDeleted: 0,
          timestamp: new Date().toISOString()
        };
      }
      
      // Crear archivo de archivo
      await this.createYearArchiveFile(year, yearEvents);
      
      // Verificar archivo
      const verification = await this.verifyArchiveFile(year);
      if (!verification) {
        throw new Error(`Error al verificar archivo para ${year}`);
      }
      
      // Eliminar de Firebase
      const deletedCount = await this.deleteYearFromFirebase(year);
      
      return {
        success: true,
        year,
        eventsMigrated: yearEvents.length,
        eventsDeleted: deletedCount,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        year,
        eventsMigrated: 0,
        eventsDeleted: 0,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const autoMigrationService = new AutoMigrationService();
export default autoMigrationService;