import Link from "next/link";

export default function PublicNav() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4" aria-label="Navegación principal">
        <Link href="/" className="text-xl font-bold tracking-tight">SALIMO.</Link>
        <div className="flex flex-wrap gap-5 text-sm font-medium">
          <Link href="/" className="hover:underline">Inicio</Link>
          <Link href="/explorar" className="hover:underline">Explorar</Link>
          <Link href="/mapa" className="hover:underline">Mapa</Link>
        </div>
      </nav>
    </header>
  );
}
