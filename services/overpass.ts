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

export async function fetchOverpass(): Promise<RawVenue[]> {
  const query = '[out:json][timeout:25];nwr["amenity"~"^(bar|pub)$"](-26.85,-65.30,-26.75,-65.15);out center;';
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "User-Agent": "SALIMO-Sync/2.0 (" + (process.env.OVERPASS_CONTACT || "contact-not-configured") + ")",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json",
    },
    body: new URLSearchParams({ data: query }),
    cache: "no-store",
    signal: AbortSignal.timeout(28000),
  });
  if (!response.ok) throw new Error("Overpass respondió HTTP " + response.status);
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error("Respuesta Overpass demasiado grande.");
  let payload: unknown;
  try { payload = JSON.parse(text); }
  catch { throw new Error("Respuesta JSON inválida de Overpass."); }
  const rows = parseOverpass(payload);
  if (rows.length > 200) throw new Error("Hay más de 200 resultados: revisá el área de importación.");
  return rows;
}
