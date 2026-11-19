import Link from "next/link";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import PublicMap from "../components/PublicMap";
import { isWithinSalimoArea } from "@/lib/venue-coordinates";
import {
  listPublicVenues,
  venueSchemaReady,
  validCategories,
  validCities,
  venueDisplayName,
} from "@/lib/public-venues";

type Props = {
  searchParams: Promise<{ q?: string; city?: string; category?: string }>;
};
export const dynamic = "force-dynamic";
export default async function VenueMap({ searchParams }: Props) {
  const raw = await searchParams;
  const filters = {
    q: typeof raw.q === "string" ? raw.q : "",
    city: typeof raw.city === "string" ? raw.city : "",
    category: typeof raw.category === "string" ? raw.category : "",
  };
  const [venues, ready] = await Promise.all([
    listPublicVenues(filters),
    venueSchemaReady(),
  ]);
  const plotted = venues.filter((v) =>
    isWithinSalimoArea(v.latitude, v.longitude),
  );
  const markers = plotted.map((v) => ({
    id: v.id,
    name: venueDisplayName(v),
    category: v.category || "",
    city: v.city || "",
    lat: v.latitude!,
    lng: v.longitude!,
    href: `/lugares/${v.slug}`,
  }));
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value),
  );
  return (
    <div className="public-page">
      <PublicNav branded active="mapa" />
      <main className="public-container">
        <div className="public-page-heading">
          <p className="public-kicker">Explorá por ubicación</p>
          <h1>
            La ciudad, <em>en un mapa.</em>
          </h1>
          <p>Encontrá lugares publicados con ubicación disponible.</p>
        </div>
        <form action="/mapa" role="search" className="public-filters">
          <label>
            Buscar
            <input
              name="q"
              defaultValue={filters.q}
              maxLength={70}
              placeholder="Nombre o dirección"
            />
          </label>
          <label>
            Localidad
            <select name="city" defaultValue={filters.city}>
              <option value="">Todas las localidades</option>
              {validCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoría
            <select name="category" defaultValue={filters.category}>
              <option value="">Todas las categorías</option>
              {validCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="public-button public-button-blue">
            Filtrar mapa
          </button>
          <Link href="/mapa" className="public-quiet-link">
            Limpiar
          </Link>
        </form>
        <div className="map-layout">
          <section className="map-canvas" aria-label="Mapa de lugares">
            <PublicMap venues={markers} />
          </section>
          <aside className="map-list">
            <div className="map-list-header">
              <h2>Lugares en el mapa</h2>
              <p>
                {markers.length}{" "}
                {markers.length === 1
                  ? "local con ubicación"
                  : "locales con ubicación"}
              </p>
              <Link href={`/explorar?${query.toString()}`}>
                Ver todos los resultados →
              </Link>
            </div>
            {!ready || plotted.length === 0 ? (
              <div className="public-empty">
                <h3>
                  {ready
                    ? "No hay lugares en el mapa."
                    : "Estamos preparando el mapa."}
                </h3>
                <p>
                  {ready
                    ? "Probá otra búsqueda o zona. Solo aparecen locales publicados con coordenadas."
                    : "Los locales aparecerán cuando estén publicados y tengan ubicación revisada."}
                </p>
              </div>
            ) : (
              <div className="map-items">
                {plotted.map((v) => (
                  <Link
                    key={v.id}
                    href={`/lugares/${v.slug}`}
                    className="map-item"
                  >
                    <span className="map-item-kind">
                      {v.category || "Local"} · {v.city || "Tucumán"}
                    </span>
                    <strong>{venueDisplayName(v)}</strong>
                    <small>{v.address || v.location}</small>
                    <span className="map-item-arrow">Ver ficha →</span>
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
