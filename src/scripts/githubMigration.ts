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
            await admin.app().delete();
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
            await admin.app().delete();
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
        }

        // Actualizar index.json
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
        console.log('✅ Índice de eventos actualizado.');

        // -------------------------------------------------------------------
        // NUEVO: MIGRACIÓN DE ORQUESTAS
        // -------------------------------------------------------------------
        console.log('🎻 Iniciando migración de orquestas con datos...');
        const orchestrasRef = db.ref('orchestras');
        const orchSnapshot = await orchestrasRef.once('value');

        if (orchSnapshot.exists()) {
            const orchestrasData = orchSnapshot.val();
            const archiveOrchDir = path.join(process.cwd(), 'public', 'orchestra-archive');
            if (!fs.existsSync(archiveOrchDir)) {
                fs.mkdirSync(archiveOrchDir, { recursive: true });
            }

            const orchArchivePath = path.join(archiveOrchDir, 'orchestras.json');
            let archivedOrchestras: any[] = [];

            if (fs.existsSync(orchArchivePath)) {
                try {
                    const content = JSON.parse(fs.readFileSync(orchArchivePath, 'utf-8'));
                    archivedOrchestras = content.orchestras || [];
                } catch (e) {
                    console.log('Error leyendo archivo de orquestas existente.');
                }
            }

            const archivedMap = new Map();
            archivedOrchestras.forEach(o => archivedMap.set(o.name, o));

            const toRemoveFromFirebase: string[] = [];
            let newlyArchived = 0;
            let updatedInArchive = 0;

            Object.entries(orchestrasData).forEach(([id, orch]: [string, any]) => {
                const hasExtraData = orch.phone || orch.facebook || orch.instagram || orch.other || orch.type;

                if (hasExtraData) {
                    if (!archivedMap.has(orch.name)) {
                        newlyArchived++;
                    } else {
                        updatedInArchive++;
                    }

                    // Actualizar mapa (Firebase manda sobre archivo previo)
                    archivedMap.set(orch.name, { ...orch, id });

                    // Marcar para borrar de Firebase para ahorrar espacio
                    toRemoveFromFirebase.push(id);
                }
            });

            if (toRemoveFromFirebase.length > 0) {
                // Guardar archivo actualizado
                const finalOrchestras = Array.from(archivedMap.values());
                fs.writeFileSync(orchArchivePath, JSON.stringify({
                    orchestras: finalOrchestras,
                    lastUpdated: new Date().toISOString(),
                    total: finalOrchestras.length,
                    generatedBy: "GitHub Actions"
                }, null, 2));

                console.log(`✅ Archivo de orquestas actualizado: ${newlyArchived} nuevas, ${updatedInArchive} actualizadas. Total: ${finalOrchestras.length}`);

                // Borrar de Firebase
                const updates: any = {};
                toRemoveFromFirebase.forEach(id => {
                    updates[id] = null;
                });
                await orchestrasRef.update(updates);
                console.log(`✅ Eliminadas ${toRemoveFromFirebase.length} orquestas de Firebase (ahora residen en el archivo estático).`);
            } else {
                console.log('ℹ️ No hay orquestas nuevas con datos para migrar.');
            }
        }

        // Cerrar la conexión de Firebase para que el proceso termine
        await admin.app().delete();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error en el proceso de migración:', error);
        if (admin.apps.length > 0) {
            await admin.app().delete();
        }
        process.exit(1);
    }
}

runMigration();
