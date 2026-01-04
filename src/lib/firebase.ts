import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';
import { getAuth, setPersistence, browserSessionPersistence, browserLocalPersistence } from 'firebase/auth';

import { scrapeSocialStats } from './socialScraper';

const firebaseConfig = {
  apiKey: "AIzaSyCg1OiMDsmfoAGpSVYRnvWdl4tSPnLVoUo",
  authDomain: "debelingoconangel.firebaseapp.com",
  databaseURL: "https://debelingoconangel-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "debelingoconangel",
  storageBucket: "debelingoconangel.appspot.com",
  messagingSenderId: "690632293636",
  appId: "1:690632293636:web:5ccf13559fccf3d53a2451",
  measurementId: "G-T8BV0MLJQJ"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Exportar tipos de persistencia para uso en Login
export { browserSessionPersistence, browserLocalPersistence };

// Clave para almacenar la preferencia de "Recordarme"
const REMEMBER_ME_KEY = 'rememberMe';
// Clave para almacenar el timestamp del login
const LOGIN_TIMESTAMP_KEY = 'loginTimestamp';

// Constantes para el tiempo de expiración
const SESSION_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 1 día por defecto
const REMEMBERED_EXPIRATION_TIME = 30 * 24 * 60 * 60 * 1000; // 30 días si se marca "Recordarme"

/**
 * Determina qué almacenamiento usar basado en la preferencia del usuario
 */
const getStorage = () => {
  const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  return rememberMe ? localStorage : sessionStorage;
};

/**
 * Guarda el timestamp del login actual
 */
export const saveLoginTimestamp = () => {
  getStorage().setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
};

/**
 * Obtiene el timestamp del login actual
 */
export const getLoginTimestamp = (): number | null => {
  const timestamp = getStorage().getItem(LOGIN_TIMESTAMP_KEY);
  return timestamp ? parseInt(timestamp, 10) : null;
};

/**
 * Verifica si la sesión ha expirado
 * @returns true si la sesión ha expirado, false en caso contrario
 */
export const isSessionExpired = (): boolean => {
  const storage = getStorage();
  const loginTimestamp = storage.getItem(LOGIN_TIMESTAMP_KEY);
  const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';

  // Si no hay timestamp, retornamos false (se establecerá en el login o validación)
  if (!loginTimestamp) {
    return false;
  }

  const currentTime = Date.now();
  const elapsedTime = currentTime - parseInt(loginTimestamp, 10);
  const expirationTime = rememberMe ? REMEMBERED_EXPIRATION_TIME : SESSION_EXPIRATION_TIME;

  return elapsedTime > expirationTime;
};

/**
 * Limpia el timestamp del login y la preferencia
 */
export const clearLoginTimestamp = () => {
  sessionStorage.removeItem(LOGIN_TIMESTAMP_KEY);
  localStorage.removeItem(LOGIN_TIMESTAMP_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
};

// Referencia a los datos de seguidores de redes sociales
export const socialFollowersRef = ref(db, 'socialFollowers');

/**
 * Actualiza los datos de seguidores de redes sociales
 * Se conecta con el scraper para obtener datos frescos o usa fallbacks.
 * Se debe llamar cada vez que un usuario inicia sesión.
 */
export const updateSocialFollowers = async () => {
  try {
    console.log('Iniciando sincronización de redes sociales...');

    // Obtener datos actuales primero
    const snapshot = await get(socialFollowersRef);
    const currentData = snapshot.val() || {};

    const scrapedData = await scrapeSocialStats();

    // Prioridad: 1. Dato escrapeado (si existe), 2. Dato actual en DB, 3. Valor por defecto
    const dataToSave = {
      Facebook: scrapedData.Facebook || currentData.Facebook || '35.500',
      Instagram: scrapedData.Instagram || currentData.Instagram || '9.000',
      WhatsApp: scrapedData.WhatsApp || currentData.WhatsApp || '2.200',
      Telegram: scrapedData.Telegram || currentData.Telegram || '140',
      lastUpdated: new Date().toLocaleDateString('es-ES')
    };

    await set(socialFollowersRef, dataToSave);
    console.log('✅ Datos de seguidores actualizados correctamente:', dataToSave);
    return dataToSave;
  } catch (error) {
    console.error('❌ Error al actualizar datos de seguidores:', error);
    // Intentar guardar al menos la fecha si falla el scraping, o mantener datos viejos
    // En este caso solo logueamos el error para no sobrescribir datos buenos con vacíos
  }
};

