// Test script para verificar la configuración de Firebase
const firebase = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getDatabase } = require('firebase/database');

// Configuración desde el .env
const firebaseConfig = {
  apiKey: "AIzaSyCg1OiMDsmfoAGpSVYRnvWdl4tSPnLVoUo",
  authDomain: "debelingoconangel.firebaseapp.com",
  databaseURL: "https://debelingoconangel-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "debelingoconangel",
  storageBucket: "debelingoconangel.appspot.com",
  messagingSenderId: "463242021592",
  appId: "1:463242021592:web:1ed8e5c6e6d91f30c61d2d",
  measurementId: "G-MEASUREMENT_ID_FALLBACK"
};

console.log('🔍 Iniciando prueba de configuración de Firebase...');

try {
  // 1. Inicializar app
  console.log('1. Inicializando Firebase app...');
  const app = firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase app inicializada correctamente');

  // 2. Obtener servicios
  console.log('2. Obteniendo servicios de Firebase...');
  const auth = getAuth(app);
  const db = getDatabase(app);
  console.log('✅ Servicios de Auth y Database obtenidos');

  // 3. Verificar configuración de Auth
  console.log('3. Verificando configuración de Auth...');
  console.log('Auth config:', {
    apiKey: !!firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId
  });

  // 4. Intentar un login de prueba (esto fallará pero nos dará información útil)
  console.log('4. Probando conexión de autenticación...');
  signInWithEmailAndPassword(auth, 'test@example.com', 'testpassword')
    .then(() => {
      console.log('✅ Login exitoso (inesperado)');
    })
    .catch((error) => {
      console.log('📝 Error de login (esperado):', {
        code: error.code,
        message: error.message,
        email: error.customData?.email
      });
      
      // Errores específicos que nos ayudan a diagnosticar
      if (error.code === 'auth/user-not-found') {
        console.log('✅ Conexión con Auth funcionando, usuario no encontrado (normal)');
      } else if (error.code === 'auth/invalid-api-key') {
        console.log('❌ ERROR CRÍTICO: API Key inválida');
      } else if (error.code === 'auth/invalid-tenant-id') {
        console.log('❌ ERROR: Tenant ID inválido');
      } else if (error.code === 'auth/network-request-failed') {
        console.log('❌ ERROR: Problema de red o CORS');
      } else {
        console.log('ℹ️ Otro error:', error.code);
      }
    });

} catch (error) {
  console.error('❌ Error crítico en la configuración:', error);
}
