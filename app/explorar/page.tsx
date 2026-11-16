import Link from "next/link";
import PublicNav from "../components/PublicNav";
import PublicVenueCard from "../components/PublicVenueCard";
import { listPublicVenues, venueSchemaReady, validCategories, validCities } from "@/lib/public-venues";

type Props = { searchParams: Promise<{ q?: string; city?: string; category?: string }> };
export const dynamic = "force-dynamic";

export default async function Explore({ searchParams }: Props) {
  const raw = await searchParams;
  const filters = {
    q: typeof raw.q === "string" ? raw.q : "",
    city: typeof raw.city === "string" ? raw.city : "",
    category: typeof raw.category === "string" ? raw.category : "",
  };
  const [venues, ready] = await Promise.all([listPublicVenues(filters), venueSchemaReady()]);
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-9 text-gray-900">
        <div>
          <h1 className="text-3xl font-bold">Explorar lugares</h1>
          <p className="mt-2 text-gray-600">Buscá y filtrá bares, pubs y cervecerías.</p>
        </div>
        <form action="/explorar" className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3" role="search">
          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="search-q">Buscar</label>
            <input id="search-q" name="q" defaultValue={filters.q} maxLength={70} placeholder="Nombre o dirección" className="w-full rounded-lg border px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="search-city">Localidad</label>
            <select id="search-city" name="city" defaultValue={filters.city} className="w-full rounded-lg border px-3 py-2">
              <option value="">Todas</option>
              {validCities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="search-category">Categoría</label>
            <select id="search-category" name="category" defaultValue={filters.category} className="w-full rounded-lg border px-3 py-2">
              <option value="">Todas</option>
              {validCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="flex gap-4 sm:col-span-3">
            <button type="submit" className="rounded-lg bg-gray-900 px-5 py-2 text-white">Aplicar filtros</button>
            <Link href="/explorar" className="self-center text-sm underline">Limpiar</Link>
            <Link href={`/mapa?${query.toString()}`} className="ml-auto self-center text-sm underline">Ver mapa</Link>
          </div>
        </form>
        <p className="text-sm text-gray-600">{venues.length} locales encontrados{venues.length === 100 ? " (primeros 100)" : ""}</p>
        {!ready ? <p className="rounded-lg border p-4">El catálogo todavía no está habilitado. Primero revisaremos los locales existentes.</p> : null}
        {ready && venues.length === 0 ? <p className="rounded-lg border p-4">No hay resultados publicados para estos filtros.</p> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => <PublicVenueCard key={venue.id} venue={venue} />)}
        </div>
      </main>
    </>
  );
}
