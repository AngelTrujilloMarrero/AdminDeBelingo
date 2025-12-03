# Implementación de Expiración de Sesión (1 Día)

## Resumen
Se ha implementado un sistema de expiración automática de sesión que cierra la sesión del usuario después de **1 día (24 horas)** desde el último inicio de sesión.

## Cambios Realizados

### 1. **`src/lib/firebase.ts`**
Se agregaron las siguientes funcionalidades:

- **Configuración de persistencia**: Se configuró Firebase Auth para usar `browserLocalPersistence`, lo que permite que la sesión persista incluso después de cerrar el navegador.

- **Constantes y funciones de gestión de sesión**:
  - `SESSION_EXPIRATION_TIME`: Constante que define el tiempo de expiración (24 horas en milisegundos)
  - `saveLoginTimestamp()`: Guarda el timestamp del momento del login en localStorage
  - `isSessionExpired()`: Verifica si han pasado más de 24 horas desde el último login
  - `clearLoginTimestamp()`: Limpia el timestamp almacenado

### 2. **`src/components/Login.tsx`**
- Se importó la función `saveLoginTimestamp`
- Se llama a `saveLoginTimestamp()` inmediatamente después de un login exitoso para registrar el momento del inicio de sesión

### 3. **`src/App.tsx`**
Se implementaron dos mecanismos de verificación:

#### a) **Verificación al cargar la aplicación**
- Cuando se detecta un usuario autenticado, se verifica si la sesión ha expirado
- Si la sesión expiró, se cierra automáticamente y se limpia el timestamp
- Si la sesión es válida, se actualiza el timestamp (esto permite que la sesión se extienda si el usuario sigue activo)

#### b) **Verificación periódica**
- Se agregó un `useEffect` que verifica cada **1 minuto** si la sesión ha expirado
- Si detecta que la sesión expiró, cierra automáticamente la sesión del usuario

### 4. **`src/components/Header.tsx`**
- Se importó la función `clearLoginTimestamp`
- Se llama a `clearLoginTimestamp()` cuando el usuario cierra sesión manualmente
- Esto asegura que el timestamp se limpie correctamente al cerrar sesión

## Comportamiento del Sistema

### Escenarios de Uso

1. **Usuario inicia sesión**:
   - Se guarda el timestamp del momento actual
   - La sesión permanece activa

2. **Usuario usa la aplicación dentro de las 24 horas**:
   - Cada vez que se recarga la página, se actualiza el timestamp
   - La sesión se extiende automáticamente mientras el usuario esté activo

3. **Pasan más de 24 horas desde el último login**:
   - Al recargar la página, se detecta que la sesión expiró
   - Se cierra automáticamente la sesión
   - El usuario debe volver a iniciar sesión

4. **Usuario tiene la aplicación abierta más de 24 horas**:
   - El sistema verifica cada minuto si la sesión ha expirado
   - Cuando se cumplan las 24 horas, se cierra automáticamente la sesión
   - El usuario es redirigido a la pantalla de login

5. **Usuario cierra sesión manualmente**:
   - Se limpia el timestamp almacenado
   - Se cierra la sesión de Firebase

## Ventajas de esta Implementación

✅ **Seguridad mejorada**: Las sesiones no permanecen abiertas indefinidamente
✅ **Experiencia de usuario fluida**: Si el usuario está activo, la sesión se extiende automáticamente
✅ **Verificación en tiempo real**: El sistema verifica periódicamente la expiración incluso si el usuario tiene la aplicación abierta
✅ **Limpieza automática**: Los timestamps se limpian correctamente al cerrar sesión

## Configuración

Si deseas cambiar el tiempo de expiración, modifica la constante `SESSION_EXPIRATION_TIME` en `src/lib/firebase.ts`:

```typescript
// Ejemplo: Cambiar a 12 horas
const SESSION_EXPIRATION_TIME = 12 * 60 * 60 * 1000; // 12 horas

// Ejemplo: Cambiar a 7 días
const SESSION_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000; // 7 días
```

## Pruebas Recomendadas

Para verificar que el sistema funciona correctamente:

1. **Prueba de login**: Inicia sesión y verifica que se guarde el timestamp en localStorage (clave: `loginTimestamp`)
2. **Prueba de persistencia**: Recarga la página y verifica que la sesión sigue activa
3. **Prueba de expiración manual**: 
   - Modifica manualmente el timestamp en localStorage para simular que pasaron 24 horas
   - Recarga la página y verifica que se cierre la sesión automáticamente
4. **Prueba de logout**: Cierra sesión manualmente y verifica que se limpie el timestamp

## Notas Técnicas

- El timestamp se almacena en `localStorage` con la clave `loginTimestamp`
- El tiempo se mide en milisegundos desde el epoch de Unix
- La verificación periódica se ejecuta cada 60 segundos (60000ms)
- Firebase Auth maneja la autenticación real, este sistema solo gestiona la expiración temporal
