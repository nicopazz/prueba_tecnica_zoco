import SyncButton from "@/app/components/SyncButton";
import { prisma } from "@/lib/prisma";
import { venueSchemaReady } from "@/lib/public-venues";
import { previewWritesBlocked } from "@/lib/security";

export default async function Synchronizations() {
  const ready = await venueSchemaReady();
  const runs = ready ? await prisma.syncRun.findMany({
    orderBy: { startedAt: "desc" }, take: 30,
  }) : [];
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-5 py-9">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sincronizaciones</h1>
          <p className="text-sm text-gray-500">Importación desde OpenStreetMap, con clasificación opcional de Gemini.</p>
        </div>
        <SyncButton disabled={previewWritesBlocked()} />
      </div>
      {!ready ? <p className="rounded-lg border p-4">El historial persistente quedará disponible tras la migración de Neon.</p> : null}
      <div className="space-y-3">
        {runs.map((run) => <div key={run.id} className="rounded-lg border bg-white p-4">
          <p className="font-semibold">{run.status} · {run.triggeredBy}</p>
          <p className="text-sm text-gray-600">{run.startedAt.toLocaleString("es-AR")} · Encontrados: {run.foundCount} · Nuevos: {run.createdCount} · Actualizados: {run.updatedCount} · Conflictos: {run.conflictCount}</p>
        </div>)}
        {ready && runs.length === 0 ? <p>Sin ejecuciones registradas.</p> : null}
      </div>
    </main>
  );
}
