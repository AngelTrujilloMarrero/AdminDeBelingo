// Script de prueba para verificar la expiración de sesión
// Ejecuta este código en la consola del navegador cuando estés autenticado

console.log('=== PRUEBA DE EXPIRACIÓN DE SESIÓN ===\n');

// 1. Verificar si existe el timestamp
const timestamp = localStorage.getItem('loginTimestamp');
if (timestamp) {
    const loginTime = new Date(parseInt(timestamp));
    const currentTime = new Date();
    const elapsedTime = currentTime - loginTime;
    const elapsedHours = (elapsedTime / (1000 * 60 * 60)).toFixed(2);

    console.log('✅ Timestamp encontrado');
    console.log(`📅 Fecha de login: ${loginTime.toLocaleString()}`);
    console.log(`⏱️  Tiempo transcurrido: ${elapsedHours} horas`);
    console.log(`⏳ Tiempo restante: ${(24 - parseFloat(elapsedHours)).toFixed(2)} horas\n`);

    // 2. Simular expiración
    console.log('🧪 Para simular una sesión expirada, ejecuta:');
    console.log('localStorage.setItem("loginTimestamp", Date.now() - (25 * 60 * 60 * 1000));\n');
    console.log('Luego recarga la página y deberías ser desconectado automáticamente.\n');

    // 3. Verificar tiempo restante
    const remainingTime = 24 * 60 * 60 * 1000 - elapsedTime;
    if (remainingTime > 0) {
        console.log(`✅ Sesión válida - Expira en ${(remainingTime / (1000 * 60 * 60)).toFixed(2)} horas`);
    } else {
        console.log('❌ Sesión expirada - Deberías ser desconectado al recargar');
    }
} else {
    console.log('❌ No se encontró timestamp de login');
    console.log('Asegúrate de estar autenticado primero');
}

console.log('\n=== FIN DE LA PRUEBA ===');
