import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { venueDisplayName } from "@/lib/public-venues";
import { describePriority } from "@/lib/dashboard";
import { pageNameSignals } from "../priority-query";
import ReviewSignals from "../review-signals";
import { adminVisualPreview } from "@/lib/admin-visual-preview";
import { VenueStatuses } from "../venue-status";
import { parseList, pageBounds, type Params } from "../locales/list-query";
import { EmptyResults, FilterForm, ListOrder, ListPages, ListRange, SearchLocal, revision, viewHref } from "../collection-controls";
import { states, reviewState, reviewTotals } from "./review-filters";

export const dynamic = "force-dynamic";

export default async function Review({ searchParams }: { searchParams: Promise<Params> }) {
  if (adminVisualPreview()) return <main><p className="admin-empty">Conectá una base de desarrollo para consultar la bandeja de revisión.</p></main>;
  const { q, orden, pagina, tamano, estado } = await searchParams;
  const state = reviewState(estado);
  const parsed = parseList({ q, orden, pagina, tamano });
  const active: Record<string, string> = {};
  if (state !== "pendientes") active.estado = state;
  const query = { ...parsed, active };
  const where = { ...parsed.where, ...states[state] };
  let data;
  try {
    data = await prisma.$transaction(async tx => {
      const groups = await tx.venue.groupBy({ by: ["reviewStatus", "publicationStatus"], _count: true });
      const metrics = reviewTotals(groups);
      const total = query.q ? await tx.venue.count({ where }) : metrics[state];
      const bounds = pageBounds(query.page, query.size, total);
      const venues = total ? await tx.venue.findMany({
        where, orderBy: parsed.orderBy, skip: bounds.skip, take: query.size,
        select: {
          id: true, originalName: true, normalizedName: true, location: true, category: true,
          city: true, address: true, latitude: true, longitude: true, description: true,
          isActive: true, reviewStatus: true, publicationStatus: true, _count: { select: { images: true } },
        },
      }) : [];
      const matches = await pageNameSignals(tx, venues.map(venue => venue.id));
      return { metrics, total, ...bounds, venues, matches };
    }, { isolationLevel: "RepeatableRead" });
  } catch {
    return <main><section className="admin-empty" role="alert">
      <p>No se pudo consultar la bandeja de revisión.</p>
      <a className="admin-action-secondary" href={viewHref(revision, query, query.page)}>Reintentar</a>
    </section></main>;
  }
  const { metrics, total, page, pages, skip, venues } = data;
  const viewKey = viewHref(revision, query, page);
  return <main>
    <div className="admin-page-intro"><p>Comprobá qué datos necesita cada local para publicarse y qué mejoras podés agregar.</p></div>
    <div className="admin-review-metrics" aria-label="Totales generales">
      {([["Pendientes", metrics.pendientes], ["Revisados sin publicar", metrics.revisados], ["Publicados", metrics.publicados]] as const).map(([label, value]) =>
        <div className="admin-stat" key={label}><p className="admin-stat-label">{label}</p><p className="admin-stat-value">{value}</p></div>
      )}
    </div>
    <FilterForm key={"filters" + viewKey} module={revision} query={query} label="Buscar y filtrar revisión">
      <SearchLocal value={query.q} />
      <div className="admin-catalog-field"><label htmlFor="review-state">Estado</label>
        <select id="review-state" name="estado" defaultValue={state}>
          <option value="pendientes">Pendientes</option>
          <option value="revisados">Revisados sin publicar</option>
          <option value="publicados">Publicados</option>
          <option value="todos">Todos</option>
        </select>
      </div>
    </FilterForm>
    <ListOrder key={"order" + viewKey} module={revision} query={query} page={page} />
    <ListRange module={revision} query={query} page={page} skip={skip} total={total} />
    {!total && <div className="admin-empty"><EmptyResults module={revision} query={query} filtered={Boolean(query.q || state !== "pendientes")} message={!metrics.todos ? "Todavía no hay establecimientos registrados."
      : query.q ? "Ningún local coincide con la búsqueda en este estado." : "No hay establecimientos en este estado."}/></div>}
    <div className="admin-review-list">
      {venues.map((venue) => {
        const match = data.matches.get(venue.id);
        const checklist = describePriority({
          ...venue,
          imageCount: venue._count.images, isPending: venue.reviewStatus === "PENDING",
          sharedName: match?.sharedName ?? null, differentNames: match?.differentNames ?? false,
        });
        return (
          <article
            key={venue.id}
            className="admin-review-item"
          >
            <div className="admin-review-identity">
              <h2>
                {venueDisplayName(venue)}
              </h2>
              <p className="admin-venue-meta">{[venue.category || "Sin categoría", venue.city].filter(Boolean).join(" · ")}</p>
              <p className="admin-venue-meta">
                {venue.address || venue.location}
              </p>
              <VenueStatuses {...venue} />
            </div>
            <ReviewSignals {...checklist}/>
            <Link
              href={`/admin/locales/${venue.id}?volver=revision`}
              className="admin-action-secondary"
              aria-label={`Abrir ficha para editar ${venueDisplayName(venue)}`}
            >
              Abrir ficha
            </Link>
          </article>
        );
      })}
    </div>
    <ListPages module={revision} query={query} page={page} pages={pages} />
  </main>;
}
