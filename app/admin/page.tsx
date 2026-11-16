import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { venueSchemaReady } from "@/lib/public-venues";

export default async function AdminDashboard() {
  const [all, active, schemaReady] = await Promise.all([
    prisma.venue.count(),
    prisma.venue.count({ where: { isActive: true } }),
    venueSchemaReady(),
  ]);
  const [published, pending] = schemaReady
    ? await Promise.all([
        prisma.venue.count({ where: { isActive: true, publicationStatus: "PUBLISHED" } }),
        prisma.venue.count({ where: { reviewStatus: "PENDING" } }),
      ]) : [0, null];
  const cards = [
    { label: "Locales registrados", value: all },
    { label: "Activos", value: active },
    { label: "Publicados", value: published },
    { label: "Pendientes de revisión", value: pending ?? "—" },
  ];
  return (
    <main className="mx-auto max-w-6xl space-y-7 px-5 py-9">
      <h1 className="text-3xl font-bold">Panel de administración</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((item) => <div key={item.label} className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">{item.label}</p>
          <p className="mt-1 text-3xl font-bold">{item.value}</p>
        </div>)}
      </div>
      {!schemaReady ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">La ampliación de Prisma está preparada, pero todavía no se aplicó a Neon. El panel y los registros existentes siguen disponibles; la publicación pública permanecerá deshabilitada hasta realizar una migración segura.</p> : null}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/locales" className="rounded-lg border bg-white px-4 py-3 underline">Gestionar locales</Link>
        <Link href="/admin/revision" className="rounded-lg border bg-white px-4 py-3 underline">Revisar información</Link>
        <Link href="/admin/sincronizaciones" className="rounded-lg border bg-white px-4 py-3 underline">Sincronizaciones</Link>
      </div>
    </main>
  );
}
