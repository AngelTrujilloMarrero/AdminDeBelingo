import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';

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

// Configurar persistencia de sesión (se cierre al cerrar la pestaña/ventana)
setPersistence(auth, browserSessionPersistence);

// Constante para el tiempo de expiración de la sesión (1 día en milisegundos)
const SESSION_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 1 día

// Clave para almacenar el timestamp del login
const LOGIN_TIMESTAMP_KEY = 'loginTimestamp';

/**
 * Guarda el timestamp del login actual
 */
export const saveLoginTimestamp = () => {
  sessionStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
};

/**
 * Obtiene el timestamp del login actual
 */
export const getLoginTimestamp = (): number | null => {
  const timestamp = sessionStorage.getItem(LOGIN_TIMESTAMP_KEY);
  return timestamp ? parseInt(timestamp, 10) : null;
};

/**
 * Verifica si la sesión ha expirado
 * @returns true si la sesión ha expirado, false en caso contrario
 */
export const isSessionExpired = (): boolean => {
  const loginTimestamp = sessionStorage.getItem(LOGIN_TIMESTAMP_KEY);

  // Si no hay timestamp, retornamos false (se establecerá en el login o validación)
  if (!loginTimestamp) {
    return false;
  }

  const currentTime = Date.now();
  const elapsedTime = currentTime - parseInt(loginTimestamp, 10);

  return elapsedTime > SESSION_EXPIRATION_TIME;
};

/**
 * Limpia el timestamp del login
 */
export const clearLoginTimestamp = () => {
  sessionStorage.removeItem(LOGIN_TIMESTAMP_KEY);
};
