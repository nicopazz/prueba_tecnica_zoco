import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { venueSchemaReady, venueDisplayName } from "@/lib/public-venues";
import { reviewChecklist } from "@/lib/venue-review";
import type { Prisma } from "@prisma/client";

type Filter = "pendientes" | "revisados" | "publicados" | "todos";
type Props = { searchParams: Promise<{ estado?: string; q?: string }> };
const validFilters = new Set<Filter>(["pendientes", "revisados", "publicados", "todos"]);

export const dynamic = "force-dynamic";

export default async function Review({ searchParams }: Props) {
  const ready = await venueSchemaReady();
  const params = await searchParams;
  const estado: Filter = validFilters.has(params.estado as Filter) ? params.estado as Filter : "pendientes";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 70) : "";

  const stateWhere: Prisma.VenueWhereInput =
    estado === "pendientes" ? { reviewStatus: "PENDING" }
    : estado === "revisados" ? { reviewStatus: "REVIEWED", publicationStatus: { not: "PUBLISHED" } }
    : estado === "publicados" ? { publicationStatus: "PUBLISHED" } : {};

  const where: Prisma.VenueWhereInput = {
    ...stateWhere,
    ...(q ? { OR: [
      { normalizedName: { contains: q, mode: "insensitive" } },
      { originalName: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };

  const [pending, reviewed, published, venues] = ready
    ? await Promise.all([
        prisma.venue.count({ where: { reviewStatus: "PENDING" } }),
        prisma.venue.count({ where: { reviewStatus: "REVIEWED", publicationStatus: { not: "PUBLISHED" } } }),
        prisma.venue.count({ where: { publicationStatus: "PUBLISHED" } }),
        prisma.venue.findMany({
          where,
          select: {
            id: true, originalName: true, normalizedName: true, location: true,
            category: true, city: true, address: true, latitude: true,
            longitude: true, description: true, isActive: true,
            reviewStatus: true, publicationStatus: true,
            _count: { select: { images: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 100,
        }),
      ])
    : [0, 0, 0, []] as const;

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-5 py-9">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Revisión y publicación</h1>
        <p className="text-sm text-gray-600">Comprobá los datos de cada local antes de mostrarlo en la web pública. Esta lista no publica nada automáticamente.</p>
      </div>
      {!ready ? <p className="rounded-lg border p-4">Esta sección se habilitará al completar la migración de Neon.</p> : null}
      {ready ? <>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Pendientes", value: pending },
            { label: "Revisados sin publicar", value: reviewed },
            { label: "Publicados", value: published },
          ].map(item => (
            <div key={item.label} className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-600">{item.label}</p>
              <p className="text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
        <form action="/admin/revision" className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4" role="search">
          <label className="grid min-w-44 flex-1 gap-1 text-sm">
            Buscar local
            <input className="rounded-lg border px-3 py-2" name="q" defaultValue={q} maxLength={70} placeholder="Nombre o dirección" />
          </label>
          <label className="grid gap-1 text-sm">
            Estado
            <select className="rounded-lg border px-3 py-2" name="estado" defaultValue={estado}>
              <option value="pendientes">Pendientes</option>
              <option value="revisados">Revisados sin publicar</option>
              <option value="publicados">Publicados</option>
              <option value="todos">Todos</option>
            </select>
          </label>
          <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Filtrar</button>
          <Link href="/admin/revision" className="self-center text-sm underline">Limpiar</Link>
        </form>

        <p className="text-sm text-gray-600">{venues.length} locales en esta vista{venues.length === 100 ? " (primeros 100)" : ""}.</p>
        {venues.length === 0 ? <p className="rounded-lg border p-4 text-sm">No hay locales con estos filtros.</p> : null}
        <div className="space-y-3">
          {venues.map(venue => {
            const checklist = reviewChecklist({ ...venue, imageCount: venue._count.images });
            return (
              <article key={venue.id} className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-white p-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="text-lg font-semibold">{venueDisplayName(venue)}</h2>
                  <p className="text-sm text-gray-600">
                    {venue.category || "Sin categoría"} · {venue.city || "Localidad sin confirmar"} · {venue.publicationStatus === "PUBLISHED" ? "Publicado" : venue.reviewStatus === "REVIEWED" ? "Revisado, no publicado" : "Pendiente"}
                  </p>
                  <p className="text-sm text-gray-600">{venue.address || venue.location}</p>
                  {checklist.required.length ? (
                    <p className="text-sm text-amber-800">
                      <strong>Antes de publicar:</strong> {checklist.required.join(" · ")}
                    </p>
                  ) : <p className="text-sm text-green-800">Datos básicos completos; verificá que sean correctos antes de publicar.</p>}
                  {checklist.suggested.length ? <p className="text-xs text-gray-500">Opcional: {checklist.suggested.join(" · ")}</p> : null}
                </div>
                <Link href={`/admin/locales/${venue.id}?volver=revision`} className="rounded-lg border px-4 py-2 text-sm font-semibold underline">
                  Abrir ficha
                </Link>
              </article>
            );
          })}
        </div>
      </> : null}
    </main>
  );
}
