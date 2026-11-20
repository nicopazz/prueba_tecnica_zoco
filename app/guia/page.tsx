import Link from "next/link";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";

export const metadata = { title: "La guía | SALIMO." };

export default function Guide() {
  return <div className="public-page">
    <PublicNav branded active="ninguno" />
    <main className="public-container sources-page">
      <p className="public-kicker">La noche tucumana</p>
      <h1>Tu próxima <em>salida.</em></h1>
      <div className="sources-panel">
        <p>SALIMO. es una guía de bares, pubs y cervecerías de San Miguel de Tucumán y Yerba Buena.</p>
        <p><Link href="/explorar">Explorá el catálogo</Link> por nombre, localidad o categoría. En cada ficha encontrás la información disponible para organizar tu salida.</p>
        <p>En <Link href="/mapa">el mapa</Link> aparecen los locales publicados con coordenadas revisadas. Las ubicaciones importadas pueden ser aproximadas.</p>
        <p>Los horarios y datos de contacto pueden cambiar. Antes de salir, consultá los canales del establecimiento cuando estén disponibles en su ficha.</p>
        <p>Solo mostramos fotos cuando contamos con permiso o licencia apropiada. Conocé <Link href="/fuentes">las fuentes y atribuciones</Link> de la guía.</p>
      </div>
      <Link href="/explorar" className="public-button">Encontrar un lugar</Link>
    </main>
    <PublicFooter />
  </div>;
}
