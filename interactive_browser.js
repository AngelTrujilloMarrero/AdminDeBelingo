import puppeteer from 'puppeteer';

async function run() {
  console.log("Iniciando navegador persistente con Puppeteer...");
  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      userDataDir: './user_data_fb',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    
    console.log("Navegando a developers.facebook.com/apps/...");
    await page.goto('https://developers.facebook.com/apps/', { waitUntil: 'networkidle2' });
    
    console.log("\n=======================================================");
    console.log("¡NAVEGADOR PERSISTENTE ABIERTO!");
    console.log("Por favor, si te lo pide, inicia sesión de nuevo (esta vez se guardará de forma permanente).");
    console.log("Una vez que estés viendo la lista de aplicaciones o tu aplicación, mantén el navegador abierto.");
    console.log("=======================================================\n");

    // Esperar a que el usuario navegue a una aplicación
    // Escaneamos la URL periódicamente para ver si entra en el dashboard de una app
    const interval = setInterval(async () => {
      try {
        const currentUrl = page.url();
        if (currentUrl.includes('/apps/') && !currentUrl.endsWith('/apps/')) {
          // Extraer el App ID de la URL. Ej: https://developers.facebook.com/apps/1234567890/dashboard/
          const match = currentUrl.match(/\/apps\/(\d+)/);
          if (match) {
            const appId = match[1];
            console.log(`\n[DETECTADO] ¡Entraste a la aplicación con ID: ${appId}!`);
            console.log("Intentando leer los datos de configuración...");
            
            // Ir a la sección de configuración básica
            const settingsUrl = `https://developers.facebook.com/apps/${appId}/settings/basic/`;
            console.log(`Navegando a la configuración básica para obtener el App Secret: ${settingsUrl}`);
            
            const settingsPage = await browser.newPage();
            await settingsPage.goto(settingsUrl, { waitUntil: 'networkidle2' });
            
            // Intentar leer el App Secret si está visible o pedirlo al usuario
            console.log("Por favor, en la página de Configuración Básica, copia el 'App Secret' (Clave secreta) si lo necesitas.");
            clearInterval(interval);
          }
        }
      } catch (e) {
        // Ignorar errores temporales de navegación
      }
    }, 2000);

    // Mantener vivo
    await new Promise(() => {});
  } catch (error) {
    console.error("Error en el navegador:", error);
  }
}

run();
