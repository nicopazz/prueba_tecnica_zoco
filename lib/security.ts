import { createHash, timingSafeEqual } from "node:crypto";

function constantTimeMatch(provided: string, expected: string): boolean {
  // Comparamos hashes de longitud fija, sin comparación directa de secretos.
  const left = createHash("sha256").update(provided, "utf8").digest();
  const right = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(left, right);
}

export function verifyAdminAuthorization(header: string | null): boolean {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  // Fallar cerrado ante una configuración incompleta.
  if (!username || !password || !header?.startsWith("Basic ")) return false;

  const value = header.slice(6).trim();
  if (!value || !/^[a-zA-Z0-9+/]+={0,2}$/.test(value)) return false;

  try {
    const credentials = Buffer.from(value, "base64").toString("utf8");
    return constantTimeMatch(credentials, username + ":" + password);
  } catch {
    return false;
  }
}

export function verifyCronAuthorization(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  return constantTimeMatch(header.slice(7), secret);
}

export function verifySyncAuthorization(header: string | null): boolean {
  const token = process.env.SYNC_API_TOKEN;
  if (!token || !header?.startsWith("Bearer ")) return false;
  return constantTimeMatch(header.slice(7), token);
}

export function isUnsafeCrossOrigin(request: Request): boolean {
  // Una solicitud cross-site o same-site (otro subdominio) no puede mutar datos.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") return true;

  const origin = request.headers.get("origin");
  if (!origin) return false; // Clientes no navegador siguen requiriendo autenticación.

  try {
    return new URL(origin).origin !== new URL(request.url).origin;
  } catch {
    return true;
  }
}

export function previewWritesBlocked(): boolean {
  // Vercel puede conectar Preview a la misma base que Production.
  // Las escrituras requieren una habilitación explícita tras aislar DATABASE_URL.
  return process.env.VERCEL_ENV === "preview" &&
    process.env.ALLOW_PREVIEW_WRITES !== "true";
}
