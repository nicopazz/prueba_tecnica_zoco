import Link from "next/link";
import ReviewSignals from "./review-signals";
import { ReviewStatus } from "./venue-status";
import { qualityGroups, type loadPriorities } from "./priority-query";

export default function DashboardQuality({ data }: { data: Awaited<ReturnType<typeof loadPriorities>> }) {
  const { group, rows, page, pages, total } = data;
  function href(key: typeof group, next = 1) {
    const search = new URLSearchParams();
    if (key !== "todos") search.set("calidad", key);
    if (next > 1) search.set("pagina", String(next));
    return "/admin" + (search.size ? "?" + search : "") + "#calidad";
  }
  return <section className="dash-card dash-quality" id="calidad">
    <h2>Prioridades de revisión</h2><p>Primero los pendientes con requisitos de publicación o coincidencias que necesitan comprobación.</p>
    <nav className="quality-filters" aria-label="Señales de calidad">{qualityGroups.map(([key, label]) =>
      <Link href={href(key)} key={key} aria-current={key === group ? "true" : undefined}>{label}</Link>)}</nav>
    {total === 0 ? <p className="dash-empty">No hay locales con estas señales.</p> :
      <ul className="quality-list">{rows.map(row => <li key={row.id}>
        <div className="quality-identity"><Link className="quality-name" href={row.href}>{row.name}</Link><ReviewStatus status={row.reviewStatus}/></div>
        <ReviewSignals {...row}/>
        <Link href={row.href} className="dash-link" aria-label={"Abrir ficha de " + row.name}>Abrir ficha</Link>
      </li>)}</ul>}
    {pages > 1 && <nav className="admin-pagination" aria-label="Páginas de prioridades"><p>Página {page} de {pages} · {total} locales</p>
      {page > 1 && <Link className="admin-action-secondary" href={href(group, page - 1)}>Anterior</Link>}
      {page < pages && <Link className="admin-action-secondary" href={href(group, page + 1)}>Siguiente</Link>}</nav>}
  </section>;
}
