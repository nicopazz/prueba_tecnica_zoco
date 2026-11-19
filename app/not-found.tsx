import Link from "next/link";
import PublicNav from "./components/PublicNav";
import PublicFooter from "./components/PublicFooter";
export default function NotFound() {
  return (
    <div className="public-page">
      <PublicNav branded active="ninguno" />
      <main className="public-container not-found-page">
        <p className="public-kicker">Página no encontrada</p>
        <h1>
          Este lugar no está <em>disponible.</em>
        </h1>
        <p>
          Puede que la dirección haya cambiado o que el local todavía no esté
          publicado.
        </p>
        <Link href="/explorar" className="public-button">
          Explorar lugares →
        </Link>
      </main>
      <PublicFooter />
    </div>
  );
}
