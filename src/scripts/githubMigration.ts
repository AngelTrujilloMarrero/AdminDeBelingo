import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Configuración de Firebase Admin desde variables de entorno
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountString) {
    console.error('❌ Error: La variable FIREBASE_SERVICE_ACCOUNT no está configurada.');
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountString);

// Inicializar Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://debelingoconangel-default-rtdb.europe-west1.firebasedatabase.app"
    });
}

const db = admin.database();

async function runMigration() {
    console.log('🚀 Iniciando proceso de migración automática...');

    try {
        const eventsRef = db.ref('events');
        const snapshot = await eventsRef.once('value');

        if (!snapshot.exists()) {
            console.log('ℹ️ No hay eventos en Firebase para migrar.');
            return;
        }

        const data = snapshot.val();
        const currentYear = new Date().getFullYear();
        const eventsByYear: { [year: string]: any[] } = {};

        // Agrupar eventos por año
        Object.entries(data).forEach(([id, event]: [string, any]) => {
            const year = new Date(event.day).getFullYear().toString();
            if (!eventsByYear[year]) eventsByYear[year] = [];
            eventsByYear[year].push({ id, ...event });
        });

        const yearsToMigrate = Object.keys(eventsByYear).filter(year => parseInt(year) < currentYear);

        if (yearsToMigrate.length === 0) {
            console.log('✅ No hay años anteriores que necesiten migración.');
            return;
        }

        const archiveDir = path.join(process.cwd(), 'public', 'events-archive');
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        const availableYears: number[] = [];

        // Procesar cada año
        for (const year of yearsToMigrate) {
            const yearInt = parseInt(year);
            const filePath = path.join(archiveDir, `${year}.json`);

            const archiveData = {
                year: yearInt,
                totalEvents: eventsByYear[year].length,
                events: eventsByYear[year],
                exportDate: new Date().toISOString(),
                migratedFromFirebase: true,
                migrationVersion: "1.0-gh-action"
            };

            fs.writeFileSync(filePath, JSON.stringify(archiveData, null, 2));
            console.log(`✅ Archivo generado para el año ${year}: ${eventsByYear[year].length} eventos.`);
            availableYears.push(yearInt);

            // OPCIONAL: Eliminar de Firebase después de migrar
            // Si quieres que el script borre los datos de Firebase automáticamente:
            /*
            for (const event of eventsByYear[year]) {
              await db.ref(`events/${event.id}`).remove();
            }
            console.log(`🗑️ Eventos del año ${year} eliminados de Firebase.`);
            */
        }

        // Actualizar index.json
        // Leer índice actual si existe
        const indexPath = path.join(archiveDir, 'index.json');
        let existingYears: number[] = [];
        if (fs.existsSync(indexPath)) {
            try {
                const indexContent = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
                existingYears = indexContent.years || [];
            } catch (e) {
                console.log('Error leyendo index.json existente, creando uno nuevo.');
            }
        }

        const finalYears = Array.from(new Set([...existingYears, ...availableYears])).sort((a, b) => b - a);

        fs.writeFileSync(indexPath, JSON.stringify({
            years: finalYears,
            lastUpdated: new Date().toISOString(),
            generatedBy: "GitHub Actions"
        }, null, 2));

        console.log('✅ Proceso de migración completado con éxito.');

    } catch (error) {
        console.error('❌ Error en el proceso de migración:', error);
        process.exit(1);
    }
}

runMigration();
