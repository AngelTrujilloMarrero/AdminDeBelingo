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
   * En el nuevo flujo con GitHub Actions, la creación se hace en el servidor de CI.
   * Este método en el cliente ahora solo es informativo o puede avisar al usuario.
   */
  async createArchiveFile(_archiveData: ArchiveData): Promise<{ success: boolean; fileName: string; error?: string }> {
    return {
      success: false,
      fileName: '',
      error: 'La migración se gestiona automáticamente vía GitHub Actions cada 1 de enero.'
    };
  }

  /**
   * Verifica si un archivo de archivo existe
   */
  async archiveExists(year: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.archiveBaseUrl}/${year}.json`, { method: 'HEAD' });
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
   * Lista todos los años disponibles en el archivo desde el index.json local
   */
  async getAvailableYears(): Promise<number[]> {
    try {
      const indexResponse = await fetch(`${this.archiveBaseUrl}/index.json`);

      if (indexResponse.ok) {
        const index = await indexResponse.json();
        return index.years || [];
      }

      // Fallback si no hay índice
      const currentYear = new Date().getFullYear();
      const years: number[] = [];
      for (let year = 2020; year < currentYear; year++) {
        if (await this.archiveExists(year)) {
          years.push(year);
        }
      }
      return years.sort((a, b) => b - a);
    } catch (error) {
      console.error('Error al obtener años disponibles:', error);
      return [];
    }
  }
}

export const staticFileService = new StaticFileService();
export default staticFileService;