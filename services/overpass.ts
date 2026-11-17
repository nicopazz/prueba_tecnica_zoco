export type RawVenue = {
  osmKey: string;
  originalName: string;
  location: string;
  category: "Bar" | "Pub";
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  address: string | null;
};

type JsonObject = Record<string, unknown>;
function object(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseOverpass(data: unknown): RawVenue[] {
  if (!object(data) || !Array.isArray(data.elements)) throw new Error("Formato inválido de Overpass.");
  const result = new Map<string, RawVenue>();
  for (const item of data.elements) {
    if (!object(item) || !object(item.tags)) continue;
    if (!["node", "way", "relation"].includes(String(item.type))) continue;
    if (typeof item.id !== "number" || !Number.isSafeInteger(item.id)) continue;
    if (item.tags.amenity !== "bar" && item.tags.amenity !== "pub") continue;
    const name = typeof item.tags.name === "string"
      ? item.tags.name.trim().replace(/\s+/g, " ") : "";
    if (name.length < 2 || name.length > 160 || /[\u0000-\u001F\u007F]/u.test(name)) continue;

    const street = typeof item.tags["addr:street"] === "string" ? item.tags["addr:street"].trim() : "";
    const number = typeof item.tags["addr:housenumber"] === "string" ? item.tags["addr:housenumber"].trim() : "";
    const point = object(item.center) ? item.center : item;
    const lat = point.lat;
    const lon = point.lon;
    const hasCoords = typeof lat === "number" && typeof lon === "number" &&
      Number.isFinite(lat) && Number.isFinite(lon) &&
      Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    const address = street ? [street, number].filter(Boolean).join(" ") : null;
    const location = address || (hasCoords ? "Lat: " + (lat as number).toFixed(6) + ", Lon: " + (lon as number).toFixed(6) : "");
    if (location.length < 3 || location.length > 250) continue;

    const rawCity = typeof item.tags["addr:city"] === "string" ? item.tags["addr:city"].trim() : "";
    const city = ["San Miguel de Tucumán", "Yerba Buena"].find(c => c.toLocaleLowerCase("es") === rawCity.toLocaleLowerCase("es")) || null;
    const osmKey = "osm:" + item.type + ":" + item.id;
    result.set(osmKey, {
      osmKey, originalName: name, location,
      category: item.tags.amenity === "pub" ? "Pub" : "Bar",
      latitude: hasCoords ? lat as number : null,
      longitude: hasCoords ? lon as number : null,
      city, address,
    });
  }
  return [...result.values()].sort((a, b) => a.osmKey.localeCompare(b.osmKey));
}

// Fuentes gratuitas, utilizadas secuencialmente. El segundo servidor sólo
// se consulta cuando el primero está caído, no para eludir límites 429.
const OVERPASS_ENDPOINTS = [
  { name: "Private.coffee", url: "https://overpass.private.coffee/api/interpreter", timeoutMs: 13000 },
  { name: "FOSSGIS lz4", url: "https://lz4.overpass-api.de/api/interpreter", timeoutMs: 13000 },
  { name: "FOSSGIS", url: "https://overpass-api.de/api/interpreter", timeoutMs: 11000 },
] as const;

export class OverpassServiceError extends Error {
  readonly reason: "UNAVAILABLE" | "RATE_LIMITED" | "INVALID_QUERY";
  readonly retryAfterSeconds: number;

  constructor(
    reason: "UNAVAILABLE" | "RATE_LIMITED" | "INVALID_QUERY",
    message: string,
    retryAfterSeconds = 60,
  ) {
    super(message);
    this.name = "OverpassServiceError";
    this.reason = reason;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function fetchOverpass(fetcher: typeof fetch = fetch): Promise<RawVenue[]> {
  // Consultas explícitas para evitar diferencias de parsers con regex.
  const bounds = "(-26.85,-65.30,-26.75,-65.15)";
  const query = `[out:json][timeout:18];(nwr["amenity"="bar"]${bounds};nwr["amenity"="pub"]${bounds};);out center;`;
  const contact = (process.env.OVERPASS_CONTACT || "").replace(/[\r\n]/g, "").slice(0, 120);
  const userAgent = "SALIMO/1.0 (+https://salimo-tucuman.vercel.app/fuentes" +
    (contact ? "; " + contact : "") + ")";
  const problems: string[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetcher(endpoint.url, {
        method: "POST",
        headers: {
          "User-Agent": userAgent,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: query }),
        cache: "no-store",
        signal: AbortSignal.timeout(endpoint.timeoutMs),
      });

      // No usar otro servidor para esquivar una limitación explícita.
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after"));
        throw new OverpassServiceError(
          "RATE_LIMITED",
          "OpenStreetMap está limitando las consultas. Probá nuevamente más tarde.",
          Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 3600) : 120,
        );
      }
      if (response.status === 400 || response.status === 406) {
        // 400 no siempre significa una consulta mal formada: algunos proxies
        // contestan 400/406 ante un fallo transitorio. Leer el texto permite
        // distinguir un error de sintaxis real de un rechazo del proveedor.
        const body = typeof response.text === "function"
          ? (await response.text()).slice(0, 4000) : "";
        const parseError = /(?:parse error|static error|Error:\\s*line\\s*\\d+|syntax error)/i.test(body);
        if (parseError) {
          console.error("Consulta Overpass inválida en", endpoint.name, body.replace(/<[^>]*>/g, " ").slice(0, 350));
          throw new OverpassServiceError(
            "INVALID_QUERY",
            "Overpass rechazó la sintaxis de la consulta. Revisar el servidor.",
          );
        }
        console.warn("Servidor Overpass rechazó la solicitud:", endpoint.name,
          "HTTP " + response.status, body.replace(/<[^>]*>/g, " ").slice(0, 180));
        problems.push(endpoint.name + ": HTTP " + response.status + " (sin error de sintaxis)");
        continue;
      }
      if (!response.ok) {
        problems.push(endpoint.name + ": HTTP " + response.status);
        continue;
      }

      const body = await response.text();
      if (body.length > 2_000_000) {
        throw new OverpassServiceError("INVALID_QUERY", "Overpass devolvió demasiados registros.");
      }
      let payload: unknown;
      try { payload = JSON.parse(body); }
      catch { problems.push(endpoint.name + ": JSON inválido"); continue; }

      // Algunos servidores devuelven HTTP 200 con un remark de timeout.
      if (object(payload) && typeof payload.remark === "string" && payload.remark.trim()) {
        problems.push(endpoint.name + ": error de Overpass");
        continue;
      }
      const rows = parseOverpass(payload);
      if (rows.length > 200) {
        throw new OverpassServiceError("INVALID_QUERY", "Hay más de 200 resultados: revisá el área de importación.");
      }
      return rows;
    } catch (error) {
      if (error instanceof OverpassServiceError && error.reason !== "UNAVAILABLE") throw error;
      problems.push(endpoint.name + ": " + (error instanceof Error ? error.name : "Error de red"));
    }
  }

  console.warn("Fuentes Overpass no disponibles:", problems.join("; "));
  throw new OverpassServiceError(
    "UNAVAILABLE",
    "No se pudo conectar con los servidores de OpenStreetMap. No se modificó ningún local. Probá nuevamente más tarde.",
    120,
  );
}
