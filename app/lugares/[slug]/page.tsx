import Link from "next/link";
import { notFound } from "next/navigation";
import PublicNav from "../../components/PublicNav";
import { getPublicVenue, venueDisplayName } from "@/lib/public-venues";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export default async function VenueDetail({ params }: Props) {
  const { slug } = await params;
  const venue = await getPublicVenue(slug);
  if (!venue) notFound();
  const name = venueDisplayName(venue);
  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-4xl space-y-7 px-5 py-9 text-gray-900">
        <Link href="/explorar" className="text-sm underline">Volver a explorar</Link>
        <header className="space-y-2">
          <p className="text-sm text-gray-500">{venue.category} · {venue.city || "Tucumán"}</p>
          <h1 className="text-4xl font-bold">{name}</h1>
          <p className="text-gray-600">{venue.address || venue.location}</p>
        </header>
        {venue.images.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {venue.images.map((img) => (
              <figure key={img.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.imageUrl} alt={img.alt || name} loading="lazy" className="h-56 w-full rounded-lg object-cover" />
                {img.attribution ? <figcaption className="mt-1 text-xs text-gray-500">{img.attribution}</figcaption> : null}
              </figure>
            ))}
          </div>
        ) : null}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Sobre el lugar</h2>
          <p className="text-gray-700">{venue.description || "Todavía no contamos con una descripción verificada."}</p>
        </section>
        <section className="space-y-3 rounded-xl border p-5">
          <h2 className="text-xl font-semibold">Información</h2>
          <p><span className="font-semibold">Dirección:</span> {venue.address || venue.location}</p>
          {venue.openingHours ? <p><span className="font-semibold">Horarios:</span> {typeof venue.openingHours === "string" ? venue.openingHours : "Consultar con el establecimiento"}</p> : <p className="text-gray-500">Horarios no confirmados</p>}
          {venue.phone ? <p>Teléfono: <a href={`tel:${venue.phone.replace(/[^+0-9]/g, "")}`} className="underline">{venue.phone}</a></p> : null}
          {venue.whatsapp ? <p><a href={`https://wa.me/${venue.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a></p> : null}
          {venue.instagram ? <p><a href={venue.instagram} target="_blank" rel="noopener noreferrer" className="underline">Instagram</a></p> : null}
          {venue.website ? <p><a href={venue.website} target="_blank" rel="noopener noreferrer" className="underline">Sitio web</a></p> : null}
          {venue.latitude !== null && venue.longitude !== null ? (
            <a href={`https://www.openstreetmap.org/?mlat=${venue.latitude}&mlon=${venue.longitude}#map=17/${venue.latitude}/${venue.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-block underline">Ver ubicación en OpenStreetMap</a>
          ) : <p className="text-gray-500">Ubicación en el mapa por confirmar</p>}
        </section>
      </main>
    </>
  );
}
