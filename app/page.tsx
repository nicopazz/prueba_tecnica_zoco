import Link from "next/link";
import PublicNav from "./components/PublicNav";
import PublicVenueCard from "./components/PublicVenueCard";
import { listPublicVenues, venueSchemaReady } from "@/lib/public-venues";

export const revalidate = 300;
export default async function Home() {
  const [venues, ready] = await Promise.all([listPublicVenues(), venueSchemaReady()]);
  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-6xl space-y-10 px-5 py-10 text-gray-900">
        <section className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-wider">San Miguel de Tucumán · Yerba Buena</p>
          <h1 className="text-4xl font-bold tracking-tight">¿Salimo? Encontrá dónde.</h1>
          <p className="max-w-2xl text-gray-600">Descubrí bares, pubs y cervecerías para tu próxima salida.</p>
          <form action="/explorar" className="flex max-w-xl flex-wrap gap-2" role="search">
            <label htmlFor="home-search" className="sr-only">Buscar un lugar</label>
            <input id="home-search" name="q" placeholder="Nombre o dirección..." className="min-w-52 flex-1 rounded-lg border border-gray-300 px-4 py-3" />
            <button type="submit" className="rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white">Buscar</button>
          </form>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/explorar?category=Bar" className="rounded-full border px-4 py-2">Bares</Link>
            <Link href="/explorar?category=Pub" className="rounded-full border px-4 py-2">Pubs</Link>
            <Link href="/explorar?category=Cervecer%C3%ADa" className="rounded-full border px-4 py-2">Cervecerías</Link>
          </div>
        </section>
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Lugares para descubrir</h2>
            <Link href="/explorar" className="text-sm underline">Ver todos</Link>
          </div>
          {!ready ? <p className="rounded-lg border p-4 text-gray-600">Estamos preparando el catálogo. Los locales aparecerán cuando se complete su revisión.</p> : null}
          {ready && venues.length === 0 ? <p className="rounded-lg border p-4 text-gray-600">Todavía no hay locales publicados.</p> : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.slice(0, 6).map((venue) => <PublicVenueCard key={venue.id} venue={venue} />)}
          </div>
        </section>
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5">
          <p>¿Preferís elegir por ubicación? Explorá los locales geolocalizados.</p>
          <Link href="/mapa" className="font-semibold underline">Abrir mapa</Link>
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-5 pb-8 text-sm text-gray-500"><Link href="/fuentes" className="underline">Datos y atribuciones</Link></footer>
    </>
  );
}
