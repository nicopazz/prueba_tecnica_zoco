import { FilterForm, SearchLocal, locales } from "../collection-controls";
import type { ListQuery } from "./list-query";

export function ListFilters({ query }: { query: ListQuery }) {
  const count = Object.keys(query.active).length;
  return <FilterForm module={locales} query={query} label="Buscar y filtrar locales">
    <SearchLocal value={query.q} />
    <details open={count > 0} className="admin-catalog-options">
      <summary>Filtros{count > 0 ? ` (${count} activos)` : ""}</summary>
      <div>{query.available.map(({ key, label, options }) => <div className="admin-catalog-field" key={key}>
        <label htmlFor={"filter-" + key}>{label}</label>
        <select id={"filter-" + key} name={key} defaultValue={query.active[key] ?? ""}>
          <option value="">Todos</option>
          {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select>
      </div>)}</div>
    </details>
  </FilterForm>;
}
