
import { ref, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { Orchestra } from '../types/orchestra';

class HybridOrchestraService {
    private archiveUrl = '/orchestra-archive/orchestras.json';

    /**
     * Obtiene orquestas combinadas de Firebase (en vivo) y archivo JSON (archivado)
     */
    async getAllOrchestras(): Promise<Orchestra[]> {
        try {
            const liveOrchestras = await this.getLiveOrchestras();
            const archivedOrchestras = await this.getArchivedOrchestras();

            // Mapear por nombre para facilitar mezcla
            // Las de Firebase sobrescriben a las archivadas (prioridad edición)
            const orchestraMap = new Map<string, Orchestra>();

            archivedOrchestras.forEach(orch => {
                orchestraMap.set(orch.name, orch);
            });

            liveOrchestras.forEach(orch => {
                orchestraMap.set(orch.name, orch);
            });

            return Array.from(orchestraMap.values());
        } catch (error) {
            console.error('Error in getAllOrchestras:', error);
            return [];
        }
    }

    /**
     * Obtiene orquestas directamente de Firebase
     */
    async getLiveOrchestras(): Promise<Orchestra[]> {
        try {
            const orchestrasRef = ref(db, 'orchestras');
            const snapshot = await get(orchestrasRef);
            const loaded: Orchestra[] = [];

            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([key, value]: [string, any]) => {
                    loaded.push({ id: key, ...value });
                });
            }
            return loaded;
        } catch (error) {
            console.error('Error fetching live orchestras:', error);
            return [];
        }
    }

    /**
     * Obtiene orquestas del archivo JSON estático
     */
    async getArchivedOrchestras(): Promise<Orchestra[]> {
        try {
            const response = await fetch(this.archiveUrl);
            if (!response.ok) return [];

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) return [];

            const data = await response.json();
            return data.orchestras || [];
        } catch (error) {
            // Es normal que falle si el archivo aún no existe
            return [];
        }
    }
}

export const hybridOrchestraService = new HybridOrchestraService();
