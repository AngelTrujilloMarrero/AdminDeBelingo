# Guía para Obtener Datos Reales de Redes Sociales

## 📋 Situación Actual

El sistema actualmente usa valores de fallback porque el scraping directo desde el navegador está bloqueado por:
- **CORS (Cross-Origin Resource Sharing)**: Las redes sociales bloquean peticiones desde otros dominios
- **Cookies HttpOnly**: Las cookies de sesión no son accesibles desde JavaScript
- **Protecciones Anti-Scraping**: Facebook, Instagram, etc. detectan y bloquean bots

## 🎯 Soluciones Recomendadas

### Opción 1: APIs Oficiales (Más Confiable) ⭐ RECOMENDADO

#### **Meta Graph API** (Facebook + Instagram)

1. **Crear una App de Facebook**:
   - Ve a [developers.facebook.com](https://developers.facebook.com)
   - Crea una nueva app
   - Agrega "Instagram Graph API" y "Facebook Graph API"

2. **Obtener Token de Acceso**:
   ```bash
   # Token de usuario (válido por 60 días)
   https://graph.facebook.com/v18.0/oauth/access_token?
     grant_type=fb_exchange_token&
     client_id={app-id}&
     client_secret={app-secret}&
     fb_exchange_token={short-lived-token}
   ```

3. **Implementar en el código**:
   ```typescript
   // En src/lib/socialScraper.ts
   
   const FACEBOOK_CONFIG = {
     accessToken: 'TU_TOKEN_AQUI',
     pageId: 'TU_PAGE_ID'
   };

   const getFacebookFollowers = async (): Promise<string | null> => {
     try {
       const response = await fetch(
         `https://graph.facebook.com/v18.0/${FACEBOOK_CONFIG.pageId}?fields=followers_count&access_token=${FACEBOOK_CONFIG.accessToken}`
       );
       const data = await response.json();
       return data.followers_count.toLocaleString('es-ES');
     } catch (error) {
       console.error('Error:', error);
       return null;
     }
   };
   ```

#### **Telegram Bot API**

1. **Crear un Bot**:
   - Habla con [@BotFather](https://t.me/botfather) en Telegram
   - Crea un bot con `/newbot`
   - Guarda el token

2. **Obtener ID del canal**:
   - Agrega el bot como administrador de tu canal
   - Usa: `https://api.telegram.org/bot{TOKEN}/getUpdates`

3. **Implementar**:
   ```typescript
   const TELEGRAM_CONFIG = {
     botToken: 'TU_BOT_TOKEN',
     channelId: '@debelingoconangel'
   };

   const getTelegramSubscribers = async (): Promise<string | null> => {
     try {
       const response = await fetch(
         `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/getChatMemberCount?chat_id=${TELEGRAM_CONFIG.channelId}`
       );
       const data = await response.json();
       return data.result.toLocaleString('es-ES');
     } catch (error) {
       console.error('Error:', error);
       return null;
     }
   };
   ```

---

### Opción 2: Backend con Puppeteer (Scraping Real)

Crea un servidor Node.js que haga el scraping usando tus cookies.

#### **Estructura del proyecto**:
```
/backend
  ├── server.js
  ├── scrapers/
  │   ├── facebook.js
  │   ├── instagram.js
  │   └── telegram.js
  └── package.json
```

#### **Instalación**:
```bash
npm install express puppeteer cookie-parser
```

#### **Ejemplo de servidor** (`server.js`):
```javascript
const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

// Middleware CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Endpoint para obtener datos
app.get('/api/social-stats', async (req, res) => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Cargar tus cookies (exportadas de tu navegador)
    const cookies = require('./cookies.json');
    await page.setCookie(...cookies);

    // Scraping de Facebook
    await page.goto('https://www.facebook.com/debelingoconangel');
    const facebookFollowers = await page.$eval(
      '[data-testid="page_followers"]',
      el => el.textContent
    );

    // Scraping de Instagram
    await page.goto('https://www.instagram.com/debelingoconangel');
    const instagramFollowers = await page.$eval(
      'meta[property="og:description"]',
      el => el.content.match(/(\d+(?:\.\d+)?[KM]?) Followers/)[1]
    );

    await browser.close();

    res.json({
      Facebook: facebookFollowers,
      Instagram: instagramFollowers,
      WhatsApp: '2.200', // Manual
      Telegram: '140'    // O usar API de Telegram
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Backend corriendo en http://localhost:3001');
});
```

#### **Exportar cookies de tu navegador**:

1. Instala la extensión "EditThisCookie" o "Cookie-Editor"
2. Ve a Facebook/Instagram mientras estás logueado
3. Exporta las cookies como JSON
4. Guárdalas en `backend/cookies.json`

#### **Actualizar el frontend**:
```typescript
// En src/lib/socialScraper.ts
export const scrapeSocialStats = async (): Promise<SocialStats> => {
  try {
    const response = await fetch('http://localhost:3001/api/social-stats');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    return fallbackStats;
  }
};
```

---

### Opción 3: Extensión de Navegador

Crea una extensión Chrome que tenga permisos especiales.

#### **manifest.json**:
```json
{
  "manifest_version": 3,
  "name": "Social Stats Scraper",
  "version": "1.0",
  "permissions": [
    "cookies",
    "storage",
    "*://*.facebook.com/*",
    "*://*.instagram.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["http://localhost:5173/*"],
    "js": ["content.js"]
  }]
}
```

#### **background.js**:
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    // Aquí harías las peticiones con las cookies del navegador
    fetch('https://www.facebook.com/debelingoconangel')
      .then(response => response.text())
      .then(html => {
        // Parsear HTML y extraer seguidores
        sendResponse({ followers: '35.500' });
      });
    return true;
  }
});
```

---

### Opción 4: Actualización Manual (Implementada) ✅

**Ya está funcionando en tu aplicación**. Es la más simple y práctica para un panel de administración personal.

#### **Cómo usar**:
1. Inicia sesión en tu panel
2. Ve a la sección "Sincronización de Redes Sociales"
3. Haz clic en "Actualización Manual"
4. Introduce los valores actuales que veas en tus redes sociales
5. Guarda los cambios

Los datos se actualizarán automáticamente en Firebase y se mostrarán en tu aplicación.

---

## 🔐 Seguridad

### ⚠️ IMPORTANTE: Nunca expongas tokens en el código del frontend

Si usas APIs oficiales:
1. **Crea variables de entorno** (`.env`):
   ```env
   VITE_FACEBOOK_TOKEN=tu_token_aqui
   VITE_TELEGRAM_TOKEN=tu_token_aqui
   ```

2. **Úsalas en el código**:
   ```typescript
   const accessToken = import.meta.env.VITE_FACEBOOK_TOKEN;
   ```

3. **Agrega `.env` a `.gitignore**

### Mejor práctica:
- **Tokens en el backend**, no en el frontend
- El frontend llama a tu backend
- El backend tiene los tokens y hace las peticiones

---

## 📊 Comparación de Opciones

| Opción | Dificultad | Confiabilidad | Actualización | Costo |
|--------|-----------|---------------|---------------|-------|
| APIs Oficiales | Media | ⭐⭐⭐⭐⭐ | Automática | Gratis* |
| Backend Puppeteer | Alta | ⭐⭐⭐⭐ | Automática | Servidor |
| Extensión | Alta | ⭐⭐⭐ | Automática | Gratis |
| Manual | Baja | ⭐⭐⭐⭐⭐ | Manual | Gratis |

*Gratis dentro de límites de uso

---

## 🚀 Recomendación Final

Para tu caso (panel personal, solo tú accedes):

1. **Corto plazo**: Usa la **actualización manual** (ya implementada)
2. **Largo plazo**: Implementa **Meta Graph API** para Facebook/Instagram + **Telegram Bot API**

Esto te dará:
- ✅ Datos 100% reales
- ✅ Actualización automática al hacer login
- ✅ Sin necesidad de backend complejo
- ✅ Gratis y confiable

---

## 📝 Próximos Pasos

1. Decide qué opción prefieres
2. Si eliges APIs oficiales, te puedo ayudar a configurarlas
3. Si prefieres backend, puedo crear el servidor completo
4. Si prefieres manual, ya está listo para usar

¿Qué opción te gustaría implementar?
