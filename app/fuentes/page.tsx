import Link from "next/link";
import PublicNav from "../components/PublicNav";
export const metadata = { title: "Datos y fuentes | SALIMO." };
export default function Sources() {
  return (
    <>
      <PublicNav />
      <main className="mx-auto max-w-3xl space-y-5 px-5 py-10 text-gray-900">
        <h1 className="text-3xl font-bold">Datos y atribuciones</h1>
        <p>SALIMO. reúne información sobre lugares para salir en Tucumán. Algunos datos provienen de OpenStreetMap y pueden cambiar.</p>
        <p>Los datos de OpenStreetMap son © colaboradores de OpenStreetMap y se distribuyen bajo ODbL. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">Conocé la licencia y atribución</a>.</p>
        <p>Solo mostramos información publicada tras una revisión administrativa. Una ficha puede no incluir fotos, horarios o contacto si no hay datos confiables.</p>
        <p>Las fotografías se mostrarán únicamente cuando contemos con permiso o licencia apropiada.</p>
        <Link href="/" className="inline-block underline">Volver al inicio</Link>
      </main>
    </>
  );
}
