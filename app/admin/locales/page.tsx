import Link from "next/link";
import { prisma } from "@/lib/prisma";
import VenueRow from "@/app/components/VenueRow";
import NewVenueButton from "@/app/components/NewVenueButton";
import SyncButton from "@/app/components/SyncButton";
import { previewWritesBlocked } from "@/lib/security";

export default async function AdminVenues() {
  // Selección explícita: sigue funcionando aun antes de aplicar columnas nuevas a Neon.
  const venues = await prisma.venue.findMany({
    select: {
      id: true, originalName: true, normalizedName: true, location: true,
      category: true, source: true, confidence: true,
      isActive: true, createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-5 py-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Establecimientos</h1>
          <p className="text-sm text-gray-500">Mostrando hasta 500 registros. Los datos no publicados no aparecen en la web pública.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <SyncButton disabled={previewWritesBlocked()} />
          <NewVenueButton />
          <Link href="/admin/locales/nuevo" className="self-center text-sm underline">Formulario completo</Link>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-left">
          <thead className="bg-gray-100 text-xs uppercase text-gray-500">
            <tr>{["Estado","Nombre","Categoría","Ubicación","Acciones"].map((name) => <th key={name} className="px-5 py-3">{name}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {venues.map((venue) => <VenueRow key={venue.id} venue={venue} />)}
            {venues.length === 0 ? <tr><td colSpan={5} className="px-5 py-8">Todavía no hay locales.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
