import type { RawVenue } from "./overpass";

export type LegacyCandidate = {
  id: string;
  originalName: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
};

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function textCoordinates(location: string): { latitude: number; longitude: number } | null {
  const match = /^Lat:\s*(-?\d+(?:\.\d+)?),\s*Lon:\s*(-?\d+(?:\.\d+)?)$/i.exec(location);
  if (!match) return null;
  return { latitude: Number(match[1]), longitude: Number(match[2]) };
}

export function sameLegacyPlace(previous: LegacyCandidate, current: RawVenue): boolean {
  if (normalized(previous.originalName) !== normalized(current.originalName)) return false;
  const oldPoint = previous.latitude != null && previous.longitude != null
    ? { latitude: previous.latitude, longitude: previous.longitude }
    : textCoordinates(previous.location);
  if (oldPoint && current.latitude != null && current.longitude != null) {
    const ns = (oldPoint.latitude - current.latitude) * 111195;
    const ew = (oldPoint.longitude - current.longitude) * 111195
      * Math.cos(current.latitude * Math.PI / 180);
    if (Math.hypot(ns, ew) <= 35) return true;
  }
  const completeAddress = current.address || (current.location.startsWith("Lat:") ? "" : current.location);
  const proposed = normalized(completeAddress);
  // Una calle sola no permite identificar sin riesgo al mismo comercio.
  if (!/\d/.test(proposed)) return false;
  return [previous.address, previous.location].some(a => !!a && normalized(a) === proposed);
}

export function findUniqueLegacyMatch(candidates: LegacyCandidate[], row: RawVenue): string | null {
  const matched = candidates.filter(item => sameLegacyPlace(item, row));
  return matched.length === 1 ? matched[0].id : null;
}
