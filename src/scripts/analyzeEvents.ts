// Script para analizar eventos por año y preparar migración
import { ref, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event } from '../types/event';

// Importar dinámicamente fs y path solo si estamos en entorno Node
let fs: any = null;
let path: any = null;

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

const loadNodeModules = async () => {
  if (isNode && !fs) {
    try {
      fs = await import('fs');
      path = await import('path');
    } catch (e) {
      console.warn('No se pudieron cargar módulos de Node:', e);
    }
  }
};

const analyzeEventsByYear = async () => {
  console.log('Analizando eventos en Firebase...');
  await loadNodeModules();

  try {
    const eventsRef = ref(db, 'events');
    const snapshot = await get(eventsRef);

    if (!snapshot.exists()) {
      console.log('No hay eventos en Firebase');
      return {
        totalEvents: 0,
        eventsByYear: {},
        currentYear: new Date().getFullYear(),
        previousYears: []
      };
    }

    const data = snapshot.val();
    const events: Event[] = [];

    Object.entries(data).forEach(([key, value]: [string, any]) => {
      events.push({ id: key, ...value });
    });

    console.log(`Total de eventos: ${events.length}`);

    // Agrupar eventos por año
    const eventsByYear: { [year: string]: Event[] } = {};
    const currentYear = new Date().getFullYear();

    events.forEach(event => {
      const year = new Date(event.day).getFullYear().toString();
      if (!eventsByYear[year]) {
        eventsByYear[year] = [];
      }
      eventsByYear[year].push(event);
    });

    // Solo si estamos en Node, crear archivos JSON
    if (fs && path) {
      // Crear directorio para archivos JSON si no existe
      const jsonDir = path.join(process.cwd(), 'public', 'events-archive');
      if (!fs.existsSync(jsonDir)) {
        fs.mkdirSync(jsonDir, { recursive: true });
        console.log(`\nDirectorio creado: ${jsonDir}`);
      }

      // Generar archivos JSON para años anteriores
      const previousYears = Object.keys(eventsByYear).filter(year => year !== currentYear.toString());

      for (const year of previousYears) {
        const fileName = `${year}.json`;
        const filePath = path.join(jsonDir, fileName);

        const yearData = {
          year: parseInt(year),
          totalEvents: eventsByYear[year].length,
          events: eventsByYear[year],
          exportDate: new Date().toISOString(),
          migratedFromFirebase: true
        };

        fs.writeFileSync(filePath, JSON.stringify(yearData, null, 2));
        console.log(`✅ Creado archivo: ${fileName} (${eventsByYear[year].length} eventos)`);
      }
    }

    const previousYears = Object.keys(eventsByYear)
      .filter(year => year !== currentYear.toString())
      .map(Number)
      .sort((a, b) => b - a);

    return {
      totalEvents: events.length,
      eventsByYear,
      currentYear,
      previousYears
    };

  } catch (error) {
    console.error('Error al analizar eventos:', error);
    throw error;
  }
};

export { analyzeEventsByYear };