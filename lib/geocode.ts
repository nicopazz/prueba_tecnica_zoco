import { isWithinSalimoArea } from "./venue-coordinates";

export type AddressCandidate = {
  name: string;
  latitude: number;
  longitude: number;
};

export function normalizeAddressQuery(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim().replace(/\s+/g, " ");
  if (query.length < 3 || query.length > 140 || /[\u0000-\u001F\u007F]/u.test(query)) return null;
  return query;
}

export function buildNominatimUrl(query: string, city: string | null): string {
  const place = /tucum[aá]n|yerba buena/i.test(query)
    ? query
    : [query, city === "Yerba Buena" ? city : "San Miguel de Tucumán", "Tucumán"].join(", ");
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", place + (/argentina/i.test(place) ? "" : ", Argentina"));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("viewbox", "-65.5,-26.6,-65.0,-27.1");
  url.searchParams.set("bounded", "1");
  return url.toString();
}

export function parseNominatimResults(payload: unknown): AddressCandidate[] {
  if (!Array.isArray(payload)) return [];
  return payload.slice(0, 5).flatMap((entry: unknown): AddressCandidate[] => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Record<string, unknown>;
    const latitude = Number(candidate.lat);
    const longitude = Number(candidate.lon);
    if (!isWithinSalimoArea(latitude, longitude)) return [];
    if (typeof candidate.display_name !== "string" || !candidate.display_name.trim()) return [];
    return [{ name: candidate.display_name.slice(0, 250), latitude, longitude }];
  });
}
