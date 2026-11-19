import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <div>
          <Link href="/" className="public-footer-logo">
            SALIMO<span>.</span>
          </Link>
          <p>Bares, pubs y cervecerías de Tucumán.</p>
        </div>
        <nav aria-label="Enlaces del pie">
          <Link href="/explorar">Explorar</Link>
          <Link href="/mapa">Mapa</Link>
          <Link href="/fuentes">Datos y atribuciones</Link>
        </nav>
      </div>
    </footer>
  );
}
