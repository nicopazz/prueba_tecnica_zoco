import Link from "next/link";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import PublicVenueCard from "../components/PublicVenueCard";
import {
  listPublicVenues,
  venueSchemaReady,
  validCategories,
  validCities,
} from "@/lib/public-venues";

type Props = {
  searchParams: Promise<{ q?: string; city?: string; category?: string }>;
};
export const dynamic = "force-dynamic";
export default async function Explore({ searchParams }: Props) {
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
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value),
  );
  return (
    <div className="public-page">
      <PublicNav branded active="explorar" />
      <main className="public-container">
        <div className="public-page-heading">
          <p className="public-kicker">Encontrá tu próxima salida</p>
          <h1>
            Explorá <em>Tucumán.</em>
          </h1>
          <p>
            Buscá bares, pubs y cervecerías en San Miguel de Tucumán y Yerba
            Buena.
          </p>
        </div>
        <form action="/explorar" role="search" className="public-filters">
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
          <button type="submit" className="public-button">
            Aplicar filtros
          </button>
          <Link href="/explorar" className="public-quiet-link">
            Limpiar
          </Link>
        </form>
        <div className="public-results-head">
          <div>
            <h2>
              Lugares para descubrir<span>.</span>
            </h2>
            <p>
              {venues.length}{" "}
              {venues.length === 1 ? "local encontrado" : "locales encontrados"}
              {venues.length === 100 ? " (primeros 100)" : ""}
            </p>
          </div>
          <Link href={`/mapa?${query.toString()}`} className="public-map-link">
            Ver en el mapa ↗
          </Link>
        </div>
        {!ready ? (
          <div className="public-empty">
            <h3>Estamos preparando el catálogo.</h3>
            <p>
              Los lugares aparecerán acá cuando estén publicados y revisados.
            </p>
          </div>
        ) : venues.length === 0 ? (
          <div className="public-empty">
            <h3>No hay resultados para esta búsqueda.</h3>
            <p>Probá con otra categoría, localidad o nombre.</p>
            <Link href="/explorar">Ver todos los lugares →</Link>
          </div>
        ) : (
          <div className="public-venue-grid">
            {venues.map((venue) => (
              <PublicVenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
