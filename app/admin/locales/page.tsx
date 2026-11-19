import Link from "next/link";
import { prisma } from "@/lib/prisma";
import VenueRow from "@/app/components/VenueRow";
import NewVenueButton from "@/app/components/NewVenueButton";
import SyncButton from "@/app/components/SyncButton";
import { previewWritesBlocked } from "@/lib/security";
import { adminVisualPreview } from "@/lib/admin-visual-preview";
import { venueSchemaReady } from "@/lib/public-venues";
import { listHref, pageBounds, parseList, type Params } from "./list-query";
import { EmptyResults, ListOrder, ListPages, ListRange } from "../collection-controls";
import { ListFilters } from "./list-controls";

const basicFields = {
  id: true, originalName: true, normalizedName: true, location: true,
  category: true, isActive: true, updatedAt: true,
} as const;

async function loadList(raw: Params) {
  const extended = await venueSchemaReady();
  const query = parseList(raw, extended);
  return prisma.$transaction(async tx => {
    const total = await tx.venue.count({ where: query.where });
    const bounds = pageBounds(query.page, query.size, total);
    const venues = total ? await tx.venue.findMany({
      select: extended
        ? { ...basicFields, city: true, address: true, reviewStatus: true, publicationStatus: true }
        : basicFields,
      where: query.where,
      orderBy: query.orderBy,
      skip: bounds.skip,
      take: query.size,
    }) : [];
    return { query, total, venues, ...bounds };
  }, { isolationLevel: "RepeatableRead" });
}

const modifiedDate = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Tucuman",
});

export default async function AdminVenues({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  if (adminVisualPreview()) return <main>
    <div className="admin-page-intro"><p>Conectá una base de desarrollo para consultar los locales.</p>
      <Link href="/admin/locales/nuevo" className="admin-action-secondary">Ver formulario de creación</Link></div>
  </main>;

  let data;
  try {
    data = await loadList(raw);
  } catch {
    const query = parseList(raw);
    return <main><section className="admin-empty" role="alert">
      <p>No se pudieron consultar los locales. Revisá la conexión y volvé a intentar.</p>
      <a className="admin-action-secondary" href={listHref(query, query.page)}>Reintentar</a>
    </section></main>;
  }
  const { query, total, venues, page, pages, skip } = data;
  const filtered = Boolean(query.q || Object.keys(query.active).length);
  const viewKey = listHref(query, page);
  return <main>
    <div className="admin-page-intro">
      <p>Administrá los datos, la actividad y la publicación de los locales.</p>
      <div className="admin-action-row">
        <NewVenueButton />
        <Link href="/admin/locales/nuevo" className="admin-action-secondary">Formulario completo</Link>
        <SyncButton disabled={previewWritesBlocked()} />
      </div>
    </div>
    <ListFilters key={"filters" + viewKey} query={query} />
    <ListOrder key={"order" + viewKey} query={query} page={page} />
    <ListRange query={query} page={page} skip={skip} total={total} />
    <div className="admin-table-shell admin-catalog-table"><table role="table" aria-label="Establecimientos">
      <thead><tr>{["Local", "Ubicación", "Estados", "Última modificación", "Acciones"].map(label =>
        <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody role="rowgroup">
        {venues.map(venue => <VenueRow key={venue.id} venue={venue} modified={modifiedDate.format(venue.updatedAt)} />)}
        {!total && <tr role="row"><td colSpan={5} role="cell" className="admin-table-empty">
          <EmptyResults query={query} filtered={filtered} message={filtered ? "No hay coincidencias para la búsqueda o los filtros aplicados." : "Todavía no hay establecimientos registrados."}/>
        </td></tr>}
      </tbody>
    </table></div>
    <ListPages query={query} page={page} pages={pages} />
  </main>;
}
