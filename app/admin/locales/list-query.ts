import type { Prisma } from "@prisma/client";
import { missingCoordinates } from "../../../lib/venue-coordinates.ts";

export type Params = Record<string, string | string[] | undefined>;
export type CollectionView = {
  active: Record<string, string>;
  q?: string;
  size: number;
  page: number;
  order: string;
};

export function parsePagination(raw: Params) {
  const size = raw.tamano === "25" ? 25 : raw.tamano === "50" ? 50 : 10;
  const page = typeof raw.pagina === "string" && /^[1-9]\d{0,8}$/.test(raw.pagina) ? Number(raw.pagina) : 1;
  return { size, page };
}
export const filters = [
  { key: "localidad", label: "Localidad", options: [["San Miguel de Tucumán", "San Miguel de Tucumán"], ["Yerba Buena", "Yerba Buena"]] },
  { key: "categoria", label: "Categoría", options: ["Bar", "Pub", "Cervecería", "Boliche"].map(value => [value, value]) },
  { key: "actividad", label: "Actividad", options: [["activo", "Activo"], ["inactivo", "Inactivo"]] },
  { key: "revision", label: "Revisión", options: [["PENDING", "Pendiente"], ["REVIEWED", "Revisado"]] },
  { key: "publicacion", label: "Publicación", options: [["DRAFT", "Borrador"], ["PUBLISHED", "Publicado"], ["HIDDEN", "Oculto"]] },
  { key: "ubicacion", label: "Coordenadas", options: [["sin-pin", "Sin coordenadas válidas"]] },
] as const;

export const orders = [
  ["modificacion-desc", "Última modificación · recientes primero", "updatedAt", "desc"],
  ["modificacion-asc", "Última modificación · antiguos primero", "updatedAt", "asc"],
  ["nombre-asc", "Nombre original · A–Z", "originalName", "asc"],
  ["nombre-desc", "Nombre original · Z–A", "originalName", "desc"],
  ["creacion-desc", "Creación · recientes primero", "createdAt", "desc"],
  ["creacion-asc", "Creación · antiguos primero", "createdAt", "asc"],
] as const;

export function parseList(raw: Params, extended = true) {
  const q = typeof raw.q === "string" ? raw.q.replace(/\p{Cc}/gu, " ").trim().slice(0, 100) : "";
  const active: Partial<Record<typeof filters[number]["key"], string>> = {};
  const available = filters.filter(f => extended || f.key === "actividad" || f.key === "categoria");
  for (const { key, options } of available) {
    const value = raw[key];
    if (typeof value === "string" && options.some(([v]) => v === value)) active[key] = value;
  }
  const { size, page } = parsePagination(raw);
  const order = orders.find(([value]) => value === raw.orden) ?? orders[0];
  const where: Prisma.VenueWhereInput = {};
  if (q) {
    const contains = q.replace(/[\\%_]/g, "\\$&");
    const search = { contains, mode: "insensitive" as const };
    where.OR = [{ originalName: search }, { normalizedName: search }, { location: search }];
    if (extended) where.OR.push({ address: search });
  }
  if (active.localidad) where.city = active.localidad;
  if (active.categoria) where.category = active.categoria;
  if (active.actividad) where.isActive = active.actividad === "activo";
  if (active.revision) where.reviewStatus = active.revision;
  if (active.publicacion) where.publicationStatus = active.publicacion;
  if (active.ubicacion) where.AND = missingCoordinates;
  const orderBy: Prisma.VenueOrderByWithRelationInput[] = [{ [order[2]]: order[3] }, { id: order[3] }];
  return { q, active, available, size, page, order: order[0], where, orderBy };
}

export type ListQuery = ReturnType<typeof parseList>;

export function listHref(query: ListQuery, page: number, clear = false) {
  return collectionHref("/admin/locales", orders[0][0], query, page, clear);
}

export function collectionHref(path: string, defaultOrder: string, query: CollectionView, page: number, clear = false) {
  const params = new URLSearchParams(clear ? {} : query.active);
  if (query.q && !clear) params.set("q", query.q);
  if (query.order !== defaultOrder) params.set("orden", query.order);
  if (query.size !== 10) params.set("tamano", String(query.size));
  if (page > 1) params.set("pagina", String(page));
  return path + (params.size ? "?" + params : "");
}

export function pageBounds(requested: number, size: number, total: number) {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(requested, pages);
  return { pages, page, skip: (page - 1) * size };
}
