import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


function registrarLog(mensaje) {
  const fecha = new Date().toISOString();
  const lineaLog = `[${fecha}] - ${mensaje}\n`;
  const rutaLog = path.join(__dirname, 'historial_ejecuciones.log');
  
  
  fs.appendFileSync(rutaLog, lineaLog, 'utf8');
  console.log(lineaLog.trim());
}

async function ejecutarSincronizacion() {
  registrarLog("INICIO: Disparando sincronización automática...");
  
  try {

    const respuesta = await fetch("http://localhost:3000/api/sync");
    const datos = await respuesta.json();

    if (respuesta.ok && datos.success) {
      registrarLog(`ÉXITO: ${datos.message}`);
    } else {
      registrarLog(`ADVERTENCIA: La API respondió pero falló. Detalle: ${datos.error}`);
    }
  } catch (error) {
    registrarLog(`ERROR FATAL: No se pudo conectar con el servidor local. ¿Está encendido? Detalle: ${error.message}`);
  }
}



const frecuencia = '*/2 * * * *'; 

registrarLog(`Servicio de automatización iniciado. Ejecutando con frecuencia: ${frecuencia}`);

cron.schedule(frecuencia, () => {
  ejecutarSincronizacion();
});