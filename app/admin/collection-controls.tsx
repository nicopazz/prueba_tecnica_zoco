import type { ReactNode } from "react";
import Link from "next/link";
import Icon from "./admin-icon";
import { collectionHref, orders, type CollectionView } from "./locales/list-query";

type Module = {
  path: string;
  plural: string;
  singular: string;
  orders: ReadonlyArray<readonly [string, string, ...string[]]>;
};

export const locales: Module = { path: "/admin/locales", plural: "locales", singular: "local", orders };
export const revision: Module = { ...locales, path: "/admin/revision" };
export const sincronizaciones: Module = {
  path: "/admin/sincronizaciones", plural: "ejecuciones", singular: "ejecución",
  orders: [["desc", "Inicio · recientes primero"], ["asc", "Inicio · antiguas primero"]],
};

export function viewHref(module: Module, query: CollectionView, page: number, clear = false) {
  return collectionHref(module.path, module.orders[0][0], query, page, clear);
}

export function FilterForm({ module, query, children, label }: {
  module: Module; query: CollectionView; children: ReactNode; label: string;
}) {
  return <form action={module.path} className="admin-catalog-filters" aria-label={label} role={query.q !== undefined ? "search" : undefined}>
    <input type="hidden" name="orden" value={query.order} />
    <input type="hidden" name="tamano" value={query.size} />
    {children}
    <div className="admin-action-row">
      <button className="admin-action-primary">Aplicar</button>
      {(Object.keys(query.active).length > 0 || query.q) && <Link className="admin-action-secondary" href={viewHref(module, query, 1, true)}>Limpiar filtros</Link>}
    </div>
  </form>;
}

export function SearchLocal({ value }: { value: string }) {
  return <label>Buscar local
    <span className="admin-search-box"><Icon name="search" size={18}/><input type="search" name="q" defaultValue={value} maxLength={100} placeholder="Nombre, dirección o ubicación" /></span>
  </label>;
}

export function EmptyResults({ message, query, filtered, module = locales }: {
  message: string; query: CollectionView; filtered: boolean; module?: Module;
}) {
  return <div className="admin-empty-results">
    <p>{message}</p>
    {filtered && <Link href={viewHref(module, query, 1, true)} className="admin-action-secondary">Restablecer vista</Link>}
  </div>;
}

export function ListOrder({ query, page, module = locales }: { query: CollectionView; page: number; module?: Module }) {
  return <form className="admin-catalog-order" action={module.path}>
    {Object.entries(query.active).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
    {query.q !== undefined && <input type="hidden" name="q" value={query.q} />}
    <input type="hidden" name="pagina" value={page} />
    <div className="admin-catalog-field"><label htmlFor="catalog-order">Ordenar por</label>
      <select id="catalog-order" name="orden" defaultValue={query.order}>
        {module.orders.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    <div className="admin-catalog-field"><label htmlFor="catalog-size">Por página</label>
      <select id="catalog-size" name="tamano" defaultValue={query.size}>
        {[10, 25, 50].map(size => <option key={size}>{size}</option>)}
      </select>
    </div>
    <button className="admin-action-secondary">Actualizar vista</button>
  </form>;
}

type Counts = { page: number; skip: number; total: number };

export function ListRange({ query, page, skip, total, module = locales }: Counts & { query: CollectionView; module?: Module }) {
  return <>
    {query.page !== page && <p className="admin-results-summary">La página solicitada queda fuera del rango. Se muestra la página {page}.</p>}
    <p className="admin-results-summary" role="status">{total
      ? `Mostrando ${skip + 1}–${Math.min(skip + query.size, total)} de ${total} ${total === 1 ? module.singular : module.plural}`
      : `0 ${module.plural}`}</p>
  </>;
}

export function ListPages({ query, page, pages, module = locales }: { query: CollectionView; page: number; pages: number; module?: Module }) {
  return <nav className="admin-pagination" aria-label={`Páginas de ${module.plural}`}>
    <p aria-current="page">Página {page} de {pages}</p>
    {([["Anterior", page - 1], ["Siguiente", page + 1]] as const).map(([label, target]) =>
      target < 1 || target > pages
        ? <button key={label} disabled className="admin-action-secondary">{label}</button>
        : <Link key={label} className="admin-action-secondary" href={viewHref(module, query, target)}>{label}</Link>
    )}
  </nav>;
}
