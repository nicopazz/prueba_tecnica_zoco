import Link from "next/link";
import { notFound } from "next/navigation";
import PublicNav from "../../components/PublicNav";
import PublicFooter from "../../components/PublicFooter";
import { isWithinSalimoArea } from "@/lib/venue-coordinates";
import { getPublicVenue, venueDisplayName } from "@/lib/public-venues";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export default async function VenueDetail({ params }: Props) {
  const { slug } = await params;
  const venue = await getPublicVenue(slug);
  if (!venue) notFound();
  const name = venueDisplayName(venue);
  const hasLocation = isWithinSalimoArea(venue.latitude, venue.longitude);
  return (
    <div className="public-page">
      <PublicNav branded active="ninguno" />
      <main className="public-container detail-page">
        <Link href="/explorar" className="public-back">
          ← Volver a explorar
        </Link>
        <header className="detail-heading">
          <p className="public-kicker">
            {venue.category || "Lugar"} · {venue.city || "Tucumán"}
          </p>
          <h1>{name}</h1>
          <p>{venue.address || venue.location}</p>
        </header>
        {venue.images.length ? (
          <div className="detail-gallery">
            {venue.images.map((img, i) => (
              <figure
                key={img.id}
                className={i === 0 ? "detail-photo-main" : ""}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.imageUrl}
                  alt={img.alt || name}
                  loading={i === 0 ? "eager" : "lazy"}
                />
                {img.attribution ? (
                  <figcaption>{img.attribution}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        ) : (
          <div className="detail-no-photo">
            <span>
              Las fotos del lugar aparecerán cuando estén verificadas.
            </span>
          </div>
        )}
        <div className="detail-grid">
          <section className="detail-panel">
            <h2>Sobre el lugar</h2>
            <p>
              {venue.description ||
                "Todavía no contamos con una descripción verificada."}
            </p>
          </section>
          <section className="detail-panel">
            <h2>Información para tu salida</h2>
            <dl>
              <div>
                <dt>Dirección</dt>
                <dd>{venue.address || venue.location}</dd>
              </div>
              {venue.openingHours ? (
                <div>
                  <dt>Horarios</dt>
                  <dd>{venue.openingHours}</dd>
                </div>
              ) : null}
              {venue.phone ? (
                <div>
                  <dt>Teléfono</dt>
                  <dd>
                    <a href={`tel:${venue.phone.replace(/[^+0-9]/g, "")}`}>
                      {venue.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="detail-actions">
              {venue.whatsapp ? (
                <a
                  href={`https://wa.me/${venue.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp ↗
                </a>
              ) : null}
              {venue.instagram ? (
                <a
                  href={venue.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram ↗
                </a>
              ) : null}
              {venue.website ? (
                <a
                  href={venue.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sitio web ↗
                </a>
              ) : null}
              {hasLocation ? (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${venue.latitude}&mlon=${venue.longitude}#map=17/${venue.latitude}/${venue.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver ubicación ↗
                </a>
              ) : null}
            </div>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
