import Link from "next/link";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
export const metadata = { title: "Datos y fuentes | SALIMO." };
export default function Sources() {
  return (
    <div className="public-page">
      <PublicNav branded active="ninguno" />
      <main className="public-container sources-page">
        <p className="public-kicker">Transparencia</p>
        <h1>
          Datos y <em>atribuciones.</em>
        </h1>
        <div className="sources-panel">
          <p>
            SALIMO. reúne información sobre lugares para salir en Tucumán.
            Algunos datos provienen de OpenStreetMap y pueden cambiar.
          </p>
          <p>
            Los datos de OpenStreetMap son © colaboradores de OpenStreetMap y se
            distribuyen bajo ODbL.{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              Conocé la licencia y atribución ↗
            </a>
          </p>
          <p>
            Solo mostramos información publicada tras una revisión
            administrativa. Una ficha puede no incluir fotos, horarios o
            contacto si no hay datos confiables.
          </p>
          <p>
            Las fotografías se mostrarán únicamente cuando contemos con permiso
            o licencia apropiada.
          </p>
        </div>
        <Link href="/" className="public-back">
          ← Volver al inicio
        </Link>
      </main>
      <PublicFooter />
    </div>
  );
}
