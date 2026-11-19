import Link from "next/link";
import Image from "next/image";
import localFont from "next/font/local";
import PublicNav from "./components/PublicNav";
import PublicVenueCard from "./components/PublicVenueCard";
import PublicMap from "./components/PublicMap";
import {
  listPublicVenues,
  venueSchemaReady,
  venueDisplayName,
} from "@/lib/public-venues";
import { isWithinSalimoArea } from "@/lib/venue-coordinates";
import styles from "./home.module.css";
import "../docs/design/salimo-design-tokens.css";

const manrope = localFont({
  src: "../public/fonts/manrope.ttf",
  weight: "200 800",
  variable: "--home-sans",
  display: "swap",
});
const editorial = localFont({
  src: "../public/fonts/instrument-serif-italic.ttf",
  weight: "400",
  style: "italic",
  variable: "--home-serif",
  display: "swap",
});
export const revalidate = 300;

function Icon({
  kind = "arrow",
}: {
  kind?: "arrow" | "pin" | "beer" | "search";
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "pin" ? (
        <>
          <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      ) : kind === "beer" ? (
        <>
          <path d="M5 7h12v14H5zM17 9h2a3 3 0 0 1 0 6h-2M8 10v7m5-7v7M5 7a3 3 0 0 1 1-6 3 3 0 0 1 5 0 3 3 0 0 1 5 0 3 3 0 0 1 1 6" />
        </>
      ) : kind === "search" ? (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </>
      ) : (
        <>
          <path d="M4 12h16m-6-6 6 6-6 6" />
        </>
      )}
    </svg>
  );
}

export default async function Home() {
  const [venues, ready] = await Promise.all([
    listPublicVenues(),
    venueSchemaReady(),
  ]);
  const featured = venues.filter((v) => v.isFeatured).slice(0, 3);
  const markers = venues
    .filter((v) => isWithinSalimoArea(v.latitude, v.longitude))
    .map((v) => ({
      id: v.id,
      name: venueDisplayName(v),
      category: v.category || "",
      city: v.city || "",
      lat: v.latitude!,
      lng: v.longitude!,
      href: `/lugares/${v.slug}`,
    }));
  return (
    <div className={`${styles.home} ${manrope.variable} ${editorial.variable}`}>
      <PublicNav branded />
      <main className={styles.container}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>La noche tucumana</p>
            <h1 id="home-title">
              Salí. Explorá.
              <br />
              <em>Descubrí.</em>
            </h1>
            <p>
              Encontrá bares, pubs y cervecerías
              <br className={styles.desktopBreak} /> para tu próxima salida.
            </p>
          </div>
          <figure className={styles.photo}>
            <Image
              src="/images/ambiente-amigos.jpg"
              alt="Amigos brindando con cerveza en un bar de ambiente cálido"
              fill
              priority
              sizes="(max-width: 767px) 100vw, 65vw"
            />
            <figcaption>Una invitación a salir · Imagen ambiental</figcaption>
          </figure>
          <form action="/explorar" role="search" className={styles.search}>
            <Icon kind="search" />
            <label htmlFor="home-search" className="sr-only">
              Buscar por nombre o dirección
            </label>
            <input
              id="home-search"
              name="q"
              maxLength={70}
              placeholder="Buscar por nombre o dirección"
            />
            <button type="submit">
              Buscar <Icon />
            </button>
          </form>
        </section>
        <section
          className={styles.access}
          aria-label="Explorá por categoría o zona"
        >
          <Link className={styles.category} href="/explorar">
            <Icon kind="beer" />
            <span>
              <strong>Bares y cervecerías</strong>
              <small>Descubrí lugares de Tucumán.</small>
            </span>
            <span className={styles.round}>
              <Icon />
            </span>
          </Link>
          <Link className={styles.zones} href="#zonas">
            <Icon kind="pin" />
            <span>
              <strong>Explorar por zonas</strong>
              <small>San Miguel · Yerba Buena</small>
            </span>
            <span className={styles.round}>
              <Icon />
            </span>
          </Link>
          <div className={styles.chips}>
            {["Bar", "Pub", "Cervecería"].map((category, i) => (
              <Link
                key={category}
                href={`/explorar?category=${encodeURIComponent(category)}`}
              >
                {["Bares", "Pubs", "Cervecerías"][i]}
              </Link>
            ))}
          </div>
        </section>
        <div id="zonas" className={styles.zoneLinks}>
          <span>¿Por dónde salimos?</span>
          {["San Miguel de Tucumán", "Yerba Buena"].map((city) => (
            <Link
              key={city}
              href={`/explorar?city=${encodeURIComponent(city)}`}
            >
              <Icon kind="pin" />
              {city}
              <Icon />
            </Link>
          ))}
        </div>
        <section className={styles.mapSection} aria-labelledby="map-title">
          <div className={styles.mapIntro}>
            <p className={styles.eyebrow}>Explorar</p>
            <h2 id="map-title">
              Explorá Tucumán
              <br />
              <em>en el mapa.</em>
            </h2>
            <p>
              Encontrá bares, pubs y cervecerías por ubicación y descubrí tu
              próxima salida.
            </p>
            <Link className={styles.blueButton} href="/mapa">
              Ver mapa interactivo <Icon />
            </Link>
          </div>
          <div className={styles.map}>
            <PublicMap venues={markers} />
          </div>
          <aside className={styles.mapContext} aria-label="Lugares en el mapa">
            <h3>Lugares en el mapa</h3>
            <p className={styles.mapCount}>{markers.length}</p>
            <p>
              {markers.length === 1
                ? "local publicado con ubicación"
                : "locales publicados con ubicación"}
            </p>
            {!markers.length ? (
              <p className={styles.mapNote}>
                Todavía no hay lugares disponibles para mostrar en el mapa.
              </p>
            ) : null}
            <div className={styles.mapCities}>
              <span>Explorá por zona</span>
              <Link href="/mapa?city=San%20Miguel%20de%20Tucum%C3%A1n">
                San Miguel de Tucumán <Icon />
              </Link>
              <Link href="/mapa?city=Yerba%20Buena">
                Yerba Buena <Icon />
              </Link>
            </div>
          </aside>
        </section>
        <section className={styles.featured} aria-labelledby="featured-title">
          <div className={styles.sectionHead}>
            <div>
              <h2 id="featured-title">
                Lugares destacados<span>.</span>
              </h2>
              <p>Una próxima salida empieza con un lugar.</p>
            </div>
            <Link href="/explorar">
              Explorar todos <Icon />
            </Link>
          </div>
          {featured.length ? (
            <div className={styles.venueGrid}>
              {featured.map((venue) => (
                <PublicVenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <Icon kind="beer" />
              <div>
                <h3>
                  {ready
                    ? "Pronto, nuevos lugares para descubrir."
                    : "Estamos preparando tu próxima salida."}
                </h3>
                <p>
                  Los lugares destacados aparecerán acá cuando estén publicados
                  y revisados.
                </p>
              </div>
              <Link href="/explorar">
                Explorar lugares <Icon />
              </Link>
            </div>
          )}
        </section>
        <section className={styles.cta}>
          <div className={styles.ctaPhoto} aria-hidden="true" />
          <div>
            <h2>¿Ya tenés plan para hoy?</h2>
            <p>Entrá a SALIMO. y encontrá dónde salir en Tucumán.</p>
          </div>
          <Link className={styles.coralButton} href="/explorar">
            Explorar lugares <Icon />
          </Link>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link className={styles.logo} href="/">
          SALIMO<span>.</span>
        </Link>
        <p>Bares, pubs y cervecerías de Tucumán.</p>
        <Link href="/fuentes">Datos y atribuciones</Link>
        <a href="https://www.pexels.com/photo/friends-clinking-in-bar-5858080/">
          Foto ambiental: Pavel Danilyuk / Pexels
        </a>
      </footer>
    </div>
  );
}
