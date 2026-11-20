import Link from "next/link";
import MobileNavigation, { MobileMenu } from "./MobileNavigation";
import styles from "./PublicNav.module.css";

export default function PublicNav({
  branded = false,
  active = "inicio",
}: {
  branded?: boolean;
  active?: "inicio" | "explorar" | "mapa" | "ninguno";
}) {
  if (branded)
    return (
      <>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Navegación principal">
          <Link href="/" className={styles.logo} aria-label="SALIMO. Inicio">
            SALIMO<span>.</span>
          </Link>
          <p className={styles.description}>
            Guía de bares, pubs y cervecerías de Tucumán
          </p>
          <div className={styles.links}>
            <Link
              href="/"
              aria-current={active === "inicio" ? "page" : undefined}
            >
              Inicio
            </Link>
            <Link
              href="/explorar"
              aria-current={active === "explorar" ? "page" : undefined}
            >
              Explorar
            </Link>
            <Link
              href="/mapa"
              aria-current={active === "mapa" ? "page" : undefined}
            >
              Mapa
            </Link>
          </div>
          <span className={styles.location}>Tucumán, Argentina</span>
          <MobileMenu />
        </nav>
      </header>
      <MobileNavigation />
      </>
    );
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4"
        aria-label="Navegación principal"
      >
        <Link href="/" className="text-xl font-bold tracking-tight">
          SALIMO.
        </Link>
        <div className="flex flex-wrap gap-5 text-sm font-medium">
          <Link href="/" className="hover:underline">
            Inicio
          </Link>
          <Link href="/explorar" className="hover:underline">
            Explorar
          </Link>
          <Link href="/mapa" className="hover:underline">
            Mapa
          </Link>
        </div>
      </nav>
    </header>
  );
}
