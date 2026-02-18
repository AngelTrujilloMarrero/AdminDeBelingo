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
      // Usamos GET normal porque HEAD suele estar restringido
      const response = await fetch(`${this.archiveBaseUrl}/${year}.json`);
      if (!response.ok) return false;

      const contentType = response.headers.get('content-type');
      return !(contentType && contentType.includes('text/html'));
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene datos de un archivo de archivo
   */
  async getArchiveData(year: number): Promise<ArchiveData | null> {
    try {
      console.log(`[StaticFileService] Cargando datos de ${year}...`);
      const response = await fetch(`${this.archiveBaseUrl}/${year}.json`);

      if (!response.ok) {
        console.warn(`[StaticFileService] No se encontró el archivo de ${year}`);
        return null;
      }

      // Evitar procesar el index.html (reescritura de Firebase) como JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.warn(`[StaticFileService] El archivo de ${year} devolvió HTML (404 reescrito)`);
        return null;
      }

      const data = await response.json();
      console.log(`[StaticFileService] ✅ ${year} cargado con ${data.events?.length || 0} eventos.`);
      return data;
    } catch (error) {
      console.error(`[StaticFileService] Error al cargar ${year}:`, error);
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
        // Evitar procesar el index.html como JSON
        const contentType = indexResponse.headers.get('content-type');
        if (contentType && !contentType.includes('text/html')) {
          const index = await indexResponse.json();
          console.log('[StaticFileService] Índice cargado:', index.years);
          return index.years || [];
        }
      }

      // Fallback si no hay índice o devolvió HTML
      console.log('[StaticFileService] Índice no encontrado o inválido, buscando manualmente...');
      const currentYear = new Date().getFullYear();
      const years: number[] = [];
      // Empezamos en 2024 que es el inicio de la plataforma
      for (let year = 2024; year < currentYear; year++) {
        const exists = await this.archiveExists(year);
        if (exists) {
          years.push(year);
        }
      }
      console.log('[StaticFileService] Años encontrados manualmente:', years);
      return years.sort((a, b) => b - a);
    } catch (error) {
      console.error('[StaticFileService] Error al obtener años:', error);
      return [];
    }
  }
}

export const staticFileService = new StaticFileService();