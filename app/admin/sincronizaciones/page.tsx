import SyncButton from "@/app/components/SyncButton";
import { prisma } from "@/lib/prisma";
import { previewWritesBlocked } from "@/lib/security";
import { adminVisualPreview } from "@/lib/admin-visual-preview";
import { pageBounds, parsePagination, type Params } from "../locales/list-query";
import { EmptyResults, FilterForm, ListOrder, ListPages, ListRange, sincronizaciones, viewHref } from "../collection-controls";
import { runFilters, statusLabels, triggerLabels } from "./run-filters";

const runDate = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Tucuman",
});

export default async function Synchronizations({ searchParams }: { searchParams: Promise<Params> }) {
  if (adminVisualPreview()) return <main><p className="admin-empty">Conectá una base de desarrollo para consultar el historial de sincronizaciones.</p></main>;
  const raw = await searchParams;
  const order = raw.orden === "asc" ? "asc" : "desc";
  const pagination = parsePagination(raw);
  let data;
  try {
    data = await prisma.$transaction(async tx => {
      const groups = await tx.syncRun.groupBy({ by: ["triggeredBy"], _count: true, orderBy: { triggeredBy: "asc" } });
      const origins = groups.map(group => group.triggeredBy);
      const overall = groups.reduce((sum, group) => sum + group._count, 0);
      const { active, where, error } = runFilters(raw, origins);
      const filtered = Object.keys(active).length > 0;
      const total = error ? 0 : filtered ? await tx.syncRun.count({ where }) : overall;
      const bounds = pageBounds(pagination.page, pagination.size, total);
      const runs = total ? await tx.syncRun.findMany({
        where, orderBy: [{ startedAt: order }, { id: order }], skip: bounds.skip, take: pagination.size,
        select: { id: true, triggeredBy: true, startedAt: true, finishedAt: true, status: true, foundCount: true,
          createdCount: true, updatedCount: true, conflictCount: true, warnings: true, errorMessage: true },
      }) : [];
      return { origins, overall, total, error, runs, active, filtered, ...bounds };
    }, { isolationLevel: "RepeatableRead" });
  } catch {
    return <main><section className="admin-empty" role="alert"><p>No se pudo consultar el historial de sincronizaciones.</p>
      <a className="admin-action-secondary" href="">Reintentar</a></section></main>;
  }

  const { origins, active, error, overall, total, runs, page, pages, skip } = data;
  const query = { ...pagination, order, active };
  const viewKey = viewHref(sincronizaciones, query, page);
  return <main>
    <div className="admin-page-intro">
      <p>Importación desde OpenStreetMap, con clasificación opcional de Gemini.</p>
      <div className="admin-action-row"><SyncButton disabled={previewWritesBlocked()} /></div>
    </div>
    <h2 className="admin-section-title admin-history-title">Historial de ejecuciones</h2>
    <FilterForm module={sincronizaciones} query={query} key={"filters" + viewKey} label="Filtrar historial">
      <div className="admin-catalog-field"><label htmlFor="run-state">Estado</label>
        <select id="run-state" name="estado" defaultValue={active.estado ?? ""}><option value="">Todos</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {origins.length > 0 && <div className="admin-catalog-field"><label htmlFor="run-origin">Origen</label>
        <select id="run-origin" name="origen" defaultValue={active.origen ?? ""}><option value="">Todos</option>
          {origins.map(value => <option key={value} value={value}>{triggerLabels[value] ?? value}</option>)}
        </select>
      </div>}
      <div className="admin-catalog-field"><label htmlFor="run-from">Inicio desde</label>
        <input type="date" id="run-from" name="desde" defaultValue={active.desde} />
      </div>
      <div className="admin-catalog-field"><label htmlFor="run-to">Inicio hasta</label>
        <input type="date" id="run-to" name="hasta" defaultValue={active.hasta} />
      </div>
    </FilterForm>
    {error ? <p className="admin-form-error" role="alert">{error}</p> : <>
      <ListOrder query={query} module={sincronizaciones} page={page} key={"order" + viewKey} />
      {data.filtered && <p className="admin-venue-meta">Ejecuciones en todo el historial: {overall}</p>}
      <ListRange module={sincronizaciones} query={query} page={page} skip={skip} total={total} />
      {!total && <div className="admin-empty"><EmptyResults module={sincronizaciones} query={query} filtered={data.filtered} message={overall ? "Ninguna ejecución coincide con los filtros aplicados." : "Todavía no hay ejecuciones registradas."}/></div>}
      <div className="admin-sync-list">
        {runs.map((run) => (
          <article key={run.id} className="admin-sync-entry">
            <div className="admin-sync-heading"><span className={`admin-status-badge ${run.status === "SUCCESS" ? "admin-status-active" : run.status === "FAILED" ? "admin-status-pending" : "admin-status-muted"}`}>
              {statusLabels[run.status] || run.status}
            </span><strong className="admin-sync-source">{triggerLabels[run.triggeredBy] || run.triggeredBy}</strong></div>
            <p className="admin-run-time"><time dateTime={run.startedAt.toISOString()}><span>Inicio</span> {runDate.format(run.startedAt)}</time>
              {run.finishedAt ? <time dateTime={run.finishedAt.toISOString()}><span>Fin</span> {runDate.format(run.finishedAt)}</time> : null}
            </p>
            <dl className="admin-sync-results">
              {([
                ["Encontrados", run.foundCount],
                ["Nuevos", run.createdCount],
                ["Actualizados", run.updatedCount],
                ["Conflictos", run.conflictCount],
              ] as const).map(([label, count]) => (
                <div key={label}><dt>{label}</dt><dd>{count}</dd></div>
              ))}
            </dl>
            {run.errorMessage ? <p className="admin-sync-error"><strong>Error registrado</strong> {run.errorMessage}</p> : null}
            {Array.isArray(run.warnings) && run.warnings.length > 0 ? <ul className="admin-sync-warnings">{run.warnings.filter((warning): warning is string => typeof warning === "string").map((warning, index) => <li key={index}>{warning}</li>)}</ul> : null}
          </article>
        ))}
      </div>
      <ListPages module={sincronizaciones} query={query} page={page} pages={pages} />
    </>}
  </main>;
}
