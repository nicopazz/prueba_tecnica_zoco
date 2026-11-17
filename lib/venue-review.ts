import { isWithinSalimoArea } from "./venue-coordinates";

export type ReviewVenue = {
  originalName: string;
  normalizedName: string | null;
  category: string | null;
  city: string | null;
  location: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  isActive: boolean;
  imageCount: number;
};

const PUBLIC_CATEGORIES = new Set(["Bar", "Pub", "Cervecería"]);
const PUBLIC_CITIES = new Set(["San Miguel de Tucumán", "Yerba Buena"]);

export function reviewChecklist(venue: ReviewVenue): { required: string[]; suggested: string[] } {
  const required: string[] = [];
  const suggested: string[] = [];
  if (!(venue.normalizedName || venue.originalName).trim()) required.push("Falta nombre");
  if (!venue.category || !PUBLIC_CATEGORIES.has(venue.category)) required.push("Categoría no publicada");
  if (!venue.city || !PUBLIC_CITIES.has(venue.city)) required.push("Falta localidad");

  // Una cadena de coordenadas heredada no constituye una dirección legible.
  const textLocation = (venue.address || venue.location || "").trim();
  if (!textLocation || /^Lat:\s*-?\d/i.test(textLocation) || textLocation.length < 3) {
    required.push("Falta dirección verificable");
  }
  if (!venue.isActive) required.push("Local inactivo");

  if (!isWithinSalimoArea(venue.latitude, venue.longitude)) {
    suggested.push("Falta ubicar el pin en el mapa");
  }
  if (!venue.description?.trim()) suggested.push("Sin descripción");
  if (!venue.imageCount) suggested.push("Sin fotografías");
  return { required, suggested };
}
