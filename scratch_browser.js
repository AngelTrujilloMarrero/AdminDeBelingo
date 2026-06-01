import puppeteer from 'puppeteer';

async function run() {
  console.log("Iniciando navegador con Puppeteer...");
  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    console.log("Navegando a developers.facebook.com...");
    await page.goto('https://developers.facebook.com', { waitUntil: 'networkidle2' });
    
    console.log("\n=======================================================");
    console.log("¡NAVEGADOR INICIADO!");
    console.log("Por favor, inicia sesión en la ventana del navegador que se ha abierto.");
    console.log("El script se mantendrá activo para que no se cierre el navegador.");
    console.log("Presiona Ctrl+C en esta terminal cuando hayas terminado.");
    console.log("=======================================================\n");

    // Mantener el script vivo
    await new Promise(() => {});
  } catch (error) {
    console.error("Error al iniciar el navegador:", error);
  }
}

run();
