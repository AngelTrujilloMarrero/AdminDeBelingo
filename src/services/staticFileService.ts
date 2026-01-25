// Servicio de archivos estáticos para Vite
import { Event } from '../types/event';

export interface ArchiveData {
  year: number;
  totalEvents: number;
  events: Event[];
  exportDate: string;
  migratedFromFirebase: boolean;
  migrationVersion: string;
}

class StaticFileService {
  private archiveBaseUrl = '/events-archive';
  
  /**
   * Crea un archivo de archivo usando el endpoint del backend
   */
  async createArchiveFile(archiveData: ArchiveData): Promise<{ success: boolean; fileName: string; error?: string }> {
    try {
      // Llamar al endpoint para crear el archivo
      const response = await fetch('/api/create-archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(archiveData)
      });
      
      if (!response.ok) {
        throw new Error(`Error al crear archivo: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log(`✅ Archivo creado: ${result.fileName} con ${archiveData.events.length} eventos`);
      
      return {
        success: true,
        fileName: result.fileName
      };
      
    } catch (error) {
      console.error('Error al crear archivo de archivo:', error);
      return {
        success: false,
        fileName: '',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Verifica si un archivo de archivo existe
   */
  async archiveExists(year: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.archiveBaseUrl}/${year}.json`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Obtiene datos de un archivo de archivo
   */
  async getArchiveData(year: number): Promise<ArchiveData | null> {
    try {
      const response = await fetch(`${this.archiveBaseUrl}/${year}.json`);
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error al cargar archivo del año ${year}:`, error);
      return null;
    }
  }
  
  /**
   * Lista todos los años disponibles en el archivo
   */
  async getAvailableYears(): Promise<number[]> {
    try {
      // Intentar leer el archivo de índice
      const indexResponse = await fetch(`${this.archiveBaseUrl}/index.json`);
      
      if (indexResponse.ok) {
        const index = await indexResponse.json();
        return index.years || [];
      }
      
      // Si no hay índice, probar años comunes
      const currentYear = new Date().getFullYear();
      const years: number[] = [];
      
      for (let year = 2020; year < currentYear; year++) {
        if (await this.archiveExists(year)) {
          years.push(year);
        }
      }
      
      return years;
    } catch (error) {
      console.error('Error al obtener años disponibles:', error);
      return [];
    }
  }
}

export const staticFileService = new StaticFileService();
export default staticFileService;