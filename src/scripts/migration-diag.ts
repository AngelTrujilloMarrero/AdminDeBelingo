import { initializeApp, getApps, cert, getApp, deleteApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!saRaw) {
    console.error('❌ NO_SECRET: FIREBASE_SERVICE_ACCOUNT vacío');
    process.exit(2);
}
try {
    const sa = JSON.parse(saRaw);
    console.log('✅ SA JSON válido. client_email:', sa.client_email, '| project_id:', sa.project_id);

    if (getApps().length === 0) {
        initializeApp({
            credential: cert(sa),
            databaseURL: "https://debelingoconangel-default-rtdb.europe-west1.firebasedatabase.app"
        });
    }
    const db = getDatabase();

    const timer = setTimeout(() => {
        console.error('❌ TIMEOUT: once(value) no resolvió en 20s (token OAuth2 no válido / red).');
        process.exit(3);
    }, 20000);
    timer.unref?.();

    const snap = await db.ref('events').once('value');
    clearTimeout(timer);
    console.log('✅ events leído OK en CI. exists:', snap.exists(), '| numChildren:', snap.numChildren());
    await deleteApp(getApp());
    console.log('✅ deleteApp OK');
    process.exit(0);
} catch (e: any) {
    console.error('❌ ERR:', e?.message || e);
    process.exit(1);
}