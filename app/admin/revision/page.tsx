import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { venueSchemaReady, venueDisplayName } from "@/lib/public-venues";

export default async function Review() {
  const ready = await venueSchemaReady();
  const venues = ready ? await prisma.venue.findMany({
    where: { reviewStatus: "PENDING" },
    select: { id: true, normalizedName: true, originalName: true, category: true, city: true, location: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  }) : [];
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-5 py-9">
      <h1 className="text-3xl font-bold">Revisión de datos</h1>
      {!ready ? <p className="rounded-lg border p-4">Esta sección se habilitará cuando apliquemos la migración segura de Neon.</p> : null}
      {ready && venues.length === 0 ? <p>No hay registros pendientes.</p> : null}
      {venues.map((venue) => (
        <div key={venue.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
          <div>
            <p className="font-semibold">{venueDisplayName(venue)}</p>
            <p className="text-sm text-gray-500">{venue.category || "Sin categoría"} · {venue.city || venue.location}</p>
          </div>
          <Link href={`/admin/locales/${venue.id}`} className="text-sm underline">Revisar</Link>
        </div>
      ))}
    </main>
  );
}
