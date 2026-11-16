import cron from "node-cron";

const token = process.env.SYNC_API_TOKEN;
const endpoint = process.env.SYNC_API_URL || "http://localhost:3000/api/sync";
const frequency = process.env.SYNC_CRON || "0 6 * * *";
const timezone = process.env.SYNC_TIMEZONE || "America/Argentina/Tucuman";

if (!token) {
  console.error("Falta SYNC_API_TOKEN. No se iniciará el worker.");
  process.exit(1);
}

if (!cron.validate(frequency)) {
  console.error("SYNC_CRON no contiene una expresión válida.");
  process.exit(1);
}

const url = new URL(endpoint);
if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
  console.error("SYNC_API_URL debe usar HTTPS fuera del entorno local.");
  process.exit(1);
}

async function executeSync() {
  const startedAt = new Date().toISOString();
  console.log("[" + startedAt + "] Inicio de sincronización");
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(90000),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "La sincronización no terminó correctamente.");
    }
    console.log("[" + new Date().toISOString() + "] Éxito: " + data.message);
  } catch (error) {
    console.error("[" + new Date().toISOString() + "] Error de sincronización:", error);
  }
}

cron.schedule(frequency, executeSync, { timezone, noOverlap: true });
console.log("Worker iniciado. Frecuencia: " + frequency + " (" + timezone + ")");
