#!/usr/bin/env node

// Script de migración para ejecutar desde línea de comandos
// Uso: npm run migrate <año> o npm run migrate all

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, remove } from 'firebase/database';
import fs from 'fs';
import path from 'path';

// Configuración de Firebase (misma que en el proyecto)
const firebaseConfig = {
  apiKey: "AIzaSyCg1OiMDsmfoAGpSVYRnvWdl4tSPnLVoUo",
  authDomain: "debelingoconangel.firebaseapp.com",
  databaseURL: "https://debelingoconangel-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "debelingoconangel",
  storageBucket: "debelingoconangel.appspot.com",
  messagingSenderId: "463242021592",
  appId: "1:463242021592:web:1ed8e5c6e6d91f30c61d2d"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

interface Event {
  id: string;
  orquesta: string;
  municipio: string;
  lugar: string;
  hora: string;
  day: string;
  tipo: string;
  editing: boolean;
  cancelado: boolean;
  FechaAgregado: string;
  FechaEditado: string;
}

interface ArchiveData {
  year: number;
  totalEvents: number;
  events: Event[];
  exportDate: string;
  migratedFromFirebase: boolean;
  migrationVersion: string;
}

class MigrationScript {
  private eventsDir = path.join(process.cwd(), 'public', 'events-archive');
  
  constructor() {
    // Crear directorio si no existe
    if (!fs.existsSync(this.eventsDir)) {
      fs.mkdirSync(this.eventsDir, { recursive: true });
      console.log(`✅ Directorio creado: ${this.eventsDir}`);
    }
  }
  
  async analyzeAllEvents(): Promise<{ [year: string]: Event[] }> {
    console.log('🔍 Analizando eventos en Firebase...');
    
    const eventsRef = ref(db, 'events');
    const snapshot = await get(eventsRef);
    
    if (!snapshot.exists()) {
      console.log('❌ No hay eventos en Firebase');
      return {};
    }
    
    const data = snapshot.val();
    const events: Event[] = [];
    
    Object.entries(data).forEach(([key, value]: [string, any]) => {
      events.push({ id: key, ...value });
    });
    
    console.log(`📊 Total de eventos encontrados: ${events.length}`);
    
    // Agrupar por año
    const eventsByYear: { [year: string]: Event[] } = {};
    const currentYear = new Date().getFullYear().toString();
    
    events.forEach(event => {
      const year = new Date(event.day).getFullYear().toString();
      if (!eventsByYear[year]) {
        eventsByYear[year] = [];
      }
      eventsByYear[year].push(event);
    });
    
    // Mostrar distribución
    console.log('\n📅 Distribución por año:');
    Object.keys(eventsByYear)
      .sort()
      .forEach(year => {
        const count = eventsByYear[year].length;
        const isCurrentYear = year === currentYear;
        console.log(`  ${year}: ${count} eventos ${isCurrentYear ? '(AÑO ACTUAL)' : '(para migrar)'}`);
      });
    
    return eventsByYear;
  }
  
  async migrateYear(year: number): Promise<boolean> {
    console.log(`🚀 Iniciando migración del año ${year}...`);
    
    try {
      // Extraer eventos del año
      const yearEvents = await this.extractEventsFromYear(year);
      
      if (yearEvents.length === 0) {
        console.log(`⚠️ No hay eventos para migrar del año ${year}`);
        return true;
      }
      
      // Crear archivo de archivo
      await this.createArchiveFile(year, yearEvents);
      
      // Verificar archivo
      const verified = await this.verifyArchiveFile(year);
      if (!verified) {
        throw new Error(`No se pudo verificar el archivo del año ${year}`);
      }
      
      // Eliminar de Firebase
      const deletedCount = await this.deleteEventsFromYear(year);
      
      console.log(`✅ Migración completada para ${year}:`);
      console.log(`   📁 Eventos archivados: ${yearEvents.length}`);
      console.log(`   🗑️ Eventos eliminados: ${deletedCount}`);
      
      return true;
      
    } catch (error) {
      console.error(`❌ Error en migración de ${year}:`, error);
      return false;
    }
  }
  
  private async extractEventsFromYear(year: number): Promise<Event[]> {
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
  }
  
  private async createArchiveFile(year: number, events: Event[]): Promise<void> {
    const archiveData: ArchiveData = {
      year,
      totalEvents: events.length,
      events,
      exportDate: new Date().toISOString(),
      migratedFromFirebase: true,
      migrationVersion: '1.0'
    };
    
    const fileName = `${year}.json`;
    const filePath = path.join(this.eventsDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(archiveData, null, 2));
    console.log(`📁 Archivo creado: ${fileName} (${events.length} eventos)`);
  }
  
  private async verifyArchiveFile(year: number): Promise<boolean> {
    const fileName = `${year}.json`;
    const filePath = path.join(this.eventsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data: ArchiveData = JSON.parse(content);
      
      return (
        data.year === year &&
        Array.isArray(data.events) &&
        data.events.length > 0
      );
    } catch (error) {
      console.error(`Error al verificar archivo ${fileName}:`, error);
      return false;
    }
  }
  
  private async deleteEventsFromYear(year: number): Promise<number> {
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
  }
  
  async migrateAllPreviousYears(): Promise<void> {
    console.log('🚀 Iniciando migración de todos los años anteriores...');
    
    const eventsByYear = await this.analyzeAllEvents();
    const currentYear = new Date().getFullYear();
    const previousYears = Object.keys(eventsByYear)
      .map(year => parseInt(year))
      .filter(year => year < currentYear);
    
    if (previousYears.length === 0) {
      console.log('✅ No hay años anteriores para migrar');
      return;
    }
    
    console.log(`📋 Años a migrar: ${previousYears.join(', ')}`);
    
    let successCount = 0;
    let totalEventsMigrated = 0;
    
    for (const year of previousYears) {
      const eventsCount = eventsByYear[year.toString()].length;
      
      if (await this.migrateYear(year)) {
        successCount++;
        totalEventsMigrated += eventsCount;
      }
      
      // Pausa entre migraciones para no sobrecargar Firebase
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Resumen de migración:');
    console.log(`   ✅ Años migrados con éxito: ${successCount}/${previousYears.length}`);
    console.log(`   📊 Total de eventos movidos: ${totalEventsMigrated}`);
    console.log(`   🗑️ Consumo de Firebase reducido significativamente`);
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log('Uso:');
    console.log('  npm run migrate analyze    - Analizar eventos sin migrar');
    console.log('  npm run migrate <año>     - Migrar año específico');
    console.log('  npm run migrate all       - Migrar todos los años anteriores');
    process.exit(1);
  }
  
  const migrator = new MigrationScript();
  
  try {
    if (command === 'analyze') {
      await migrator.analyzeAllEvents();
    } else if (command === 'all') {
      await migrator.migrateAllPreviousYears();
    } else {
      const year = parseInt(command);
      if (isNaN(year) || year < 2020 || year > 2030) {
        console.error('❌ Año inválido. Use un año entre 2020 y 2030');
        process.exit(1);
      }
      await migrator.migrateYear(year);
    }
  } catch (error) {
    console.error('❌ Error en ejecución:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MigrationScript };