import Link from "next/link";
import PublicNav from "../components/PublicNav";
import PublicMap from "../components/PublicMap";
import { listPublicVenues, venueSchemaReady, validCategories, validCities, venueDisplayName } from "@/lib/public-venues";

type Props = { searchParams: Promise<{ q?: string; city?: string; category?: string }> };
export const dynamic = "force-dynamic";

export default async function VenueMap({ searchParams }: Props) {
  const params = await searchParams;
  const filters = {
    q: typeof params.q === "string" ? params.q : "",
    city: typeof params.city === "string" ? params.city : "",
    category: typeof params.category === "string" ? params.category : "",
  };
  const [venues, ready] = await Promise.all([listPublicVenues(filters), venueSchemaReady()]);
  const plotted = venues.filter(v => v.latitude !== null && v.longitude !== null && Number.isFinite(v.latitude) && Number.isFinite(v.longitude));
  const markers = plotted.map(v => ({
    id: v.id, name: venueDisplayName(v), category: v.category || "",
    city: v.city || "", lat: v.latitude!, lng: v.longitude!, href: `/lugares/${v.slug}`,
  }));
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-6xl space-y-5 px-5 py-9 text-gray-900">
        <h1 className="text-3xl font-bold">Mapa de lugares</h1>
        <form action="/mapa" className="flex flex-wrap items-end gap-3 rounded-xl border p-4" role="search">
          <label className="grid flex-1 gap-1 text-sm">Buscar
            <input name="q" defaultValue={filters.q} maxLength={70} placeholder="Nombre o dirección" className="min-w-36 rounded-lg border px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">Localidad
            <select name="city" defaultValue={filters.city} className="rounded-lg border px-3 py-2">
              <option value="">Todas</option>{validCities.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Categoría
            <select name="category" defaultValue={filters.category} className="rounded-lg border px-3 py-2">
              <option value="">Todas</option>{validCategories.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-white">Filtrar</button>
          <Link href="/mapa" className="self-center text-sm underline">Limpiar</Link>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>{markers.length} lugares con ubicación disponible</p>
          <Link href={`/explorar?${query}`} className="underline">Ver listado</Link>
        </div>
        {!ready ? <p className="rounded-lg border p-3 text-sm">El catálogo y el mapa de locales quedarán habilitados después de la migración y revisión de datos.</p> : null}
        {ready && markers.length === 0 ? <p className="rounded-lg border p-3 text-sm">No hay locales publicados con coordenadas para estos filtros.</p> : null}
        <PublicMap venues={markers} />
      </main>
    </>
  );
}
