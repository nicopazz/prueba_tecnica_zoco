import Link from "next/link";
import { adminVisualPreview } from "@/lib/admin-visual-preview";
import type { VenueSummary } from "@/lib/dashboard";
import PublicMap from "../components/PublicMap";
import { prisma } from "@/lib/prisma";
import { loadPriorities } from "./priority-query";
import Icon, { type AdminIconName } from "./admin-icon";
import { loadSyncSummary, loadVenueSummary, type SyncSummary } from "./dashboard-data";
import DashboardQuality from "./dashboard-quality";
import type { Params } from "./locales/list-query";
import { statusLabels, triggerLabels } from "./sincronizaciones/run-filters";
import "./dashboard.css";

const date = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Tucuman",
});
const percent = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const indicators = [
  ["Locales registrados", "total", "store", "/admin/locales", "coral"],
  ["Locales activos", "active", "check", "/admin/locales?actividad=activo", "green"],
  ["Pendientes de revisión", "pending", "time", "/admin/revision", "peach"],
  ["Sin coordenadas válidas", "unlocated", "pin", "/admin/locales?ubicacion=sin-pin", "blue"],
] as const;

function Timestamp({ value }: { value: Date }) {
  return <time dateTime={value.toISOString()}>{date.format(value)}</time>;
}

function Distribution({ summary }: { summary: VenueSummary | null }) {
  return <section className="dash-card dash-distribution"><h2>Distribución por categoría</h2>
    <p>Proporción sobre el total de establecimientos.</p>
    {summary?.distribution.length ? <ul>{summary.distribution.map(({ category, count, percent: share }, index) =>
      <li key={category}><span className="dash-category-icon" aria-hidden="true"><Icon name={category === "Bar" ? "glass" : category === "Cervecería" || category === "Pub" ? "mug" : "store"}/></span>
        <strong>{category}</strong><b>{count}</b><span className="dash-track" aria-hidden="true"><i data-color={index % 3} style={{ width: share + "%" }}/></span><span>{percent.format(share)} %</span></li>)}</ul>
    : <p className="dash-empty">{summary ? "Todavía no hay locales para distribuir." : "Distribución no disponible."}</p>}
  </section>;
}

function ActionCard({ data }: { data: VenueSummary | null }) {
  const pending = data?.pending;
  return <section className="dash-card dash-next">
    <div className="dash-photo" aria-hidden="true"/>
    <div className="dash-next-copy"><p><Icon name="target"/>Tu próximo paso</p>
      <h2>{pending === undefined ? "Revisión sin datos" : pending === 0 ? "La bandeja está al día." : <>Hay {pending} {pending === 1 ? "local" : "locales"}<br/>por revisar.</>}</h2>
      <p>{pending === undefined ? "Conectá la base para consultar la cola de revisión." : pending ? "Validá sus datos para mantener al día la guía de Tucumán." : "No hay establecimientos pendientes de revisión."}</p>
      {Boolean(pending) && <Link className="dash-cta" href="/admin/revision">Revisar {pending} {pending === 1 ? "local" : "locales"} <Icon name="arrow"/></Link>}
    </div>
    {data && <Link className="dash-published" href="/admin/revision?estado=publicados"><Icon name="check" size={16}/>Publicados <b>{data.published}</b></Link>}
    <a className="dash-credit" href="https://www.pexels.com/photo/friends-clinking-in-bar-5858080/">Foto · Pavel Danilyuk</a>
  </section>;
}

function Activity({ sync }: { sync: SyncSummary | null }) {
  return <section className="dash-card dash-activity"><div className="dash-card-head"><div><h2>Actividad reciente</h2>
    <p>Últimas ejecuciones de sincronización.</p></div><Link className="dash-link" href="/admin/sincronizaciones">Ver historial <Icon name="arrow" size={15}/></Link></div>
    {sync?.activity.length ? <ol>{sync.activity.map(run => {
      const icon: AdminIconName = run.status === "FAILED" ? "alert" : run.status === "SUCCESS" ? "check" : "sync";
      return <li key={run.id}><span className="dash-event-icon" data-status={run.status}><Icon name={icon}/></span>
        <div><strong>Sincronización {statusLabels[run.status]?.toLocaleLowerCase("es") ?? run.status}</strong>
          <small>{triggerLabels[run.triggeredBy] ?? run.triggeredBy}</small></div>
        <span className="dash-run-date">Inicio <Timestamp value={run.startedAt}/></span></li>;
    })}</ol> : <p className="dash-empty">{sync ? "Todavía no hay ejecuciones registradas." : "Historial no disponible."}</p>}
  </section>;
}

function SyncHealth({ sync }: { sync: SyncSummary }) {
  const last = sync.activity[0];
  return <section className="dash-card dash-health"><h2>Estado de sincronización</h2>
    <dl><div><dt>Última ejecución</dt><dd>{last ? <>{statusLabels[last.status] ?? last.status} · <Timestamp value={last.startedAt}/></> : "Sin ejecuciones"}</dd></div>
      <div><dt>Último éxito</dt><dd>{sync.lastSuccess ? <Timestamp value={sync.lastSuccess}/> : "Sin éxitos registrados"}</dd></div>
      <div><dt>Fallos en los últimos 7 días</dt><dd>{sync.failures}</dd></div></dl>
    {sync.lastError?.errorMessage && <p className="dash-error-note"><strong>Último error · Ejecución del <Timestamp value={sync.lastError.startedAt}/></strong>{sync.lastError.errorMessage}</p>}
  </section>;
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<Params> }) {
  const offline = adminVisualPreview();
  const params = await searchParams;
  const [venues, sync, quality] = offline ? [null, null, null] : await Promise.all([
    loadVenueSummary().catch(() => null), loadSyncSummary().catch(() => null), loadPriorities(prisma, params).catch(() => null),
  ]);
  return <main className="dash"><header className="dash-heading"><h1>Tu ciudad, en <em>perspectiva.</em></h1>
    <p>Estado general de los establecimientos y sus datos.</p></header>
    {!offline && (!venues || !sync) && <div className="admin-empty" role="alert">No se pudo consultar {venues ? "el historial operativo" : sync ? "el catálogo" : "la base de datos"}. <a className="dash-link" href="/admin">Reintentar</a></div>}
    <section className="dash-kpis" aria-label="Indicadores del catálogo">{indicators.map(([label, key, icon, href, tone]) =>
      <Link key={key} href={href} className="dash-card dash-kpi"><span className="dash-kpi-icon" data-tone={tone}><Icon name={icon} size={26}/></span>
        <div><h2>{label}</h2><strong>{venues ? venues[key].toLocaleString("es-AR") : <span aria-label="Dato no disponible">—</span>}</strong></div><span className="dash-kpi-arrow"><Icon name="arrow" size={16}/></span></Link>)}</section>
    <div className="dash-pair"><Distribution summary={venues}/><section className="dash-card dash-map"><div className="dash-card-head">
      <div><h2>Locales en el mapa</h2><p>{venues ? venues.points.length + " con ubicación en el área de Tucumán." : "Ubicación de los establecimientos."}</p></div>
      <Link className="dash-link" href="/mapa">Mapa público <Icon name="external" size={14}/></Link></div>
      {venues?.points.length ? <PublicMap venues={venues.points} compact/> : <p className="dash-empty">{venues ? "Aún no hay locales con coordenadas válidas." : "Ubicaciones no disponibles."}</p>}</section></div>
    <div className="dash-pair dash-lower"><Activity sync={sync}/><ActionCard data={venues}/></div>
    {sync && <SyncHealth sync={sync}/>}
    {quality ? <DashboardQuality data={quality}/> : venues && <section className="admin-empty" role="alert">No se pudieron consultar las prioridades. <a className="dash-link" href="/admin#calidad">Reintentar</a></section>}
  </main>;
}
