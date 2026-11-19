import { Prisma, type PrismaClient } from "@prisma/client";
import { describePriority, type PriorityVenue } from "../../lib/dashboard.ts";
import { latitudeRange, longitudeRange } from "../../lib/venue-coordinates.ts";
import { reviewCategories, reviewCities } from "../../lib/venue-review.ts";
import { pageBounds, parsePagination, type Params } from "./locales/list-query.ts";

export const qualityGroups = [
  ["todos", "Todos"], ["required", "Requisitos"], ["possible", "A comprobar"], ["suggested", "Mejoras"],
] as const;

const nameKey = (column: Prisma.Sql) => Prisma.sql`trim(regexp_replace(
  lower(regexp_replace(normalize(coalesce(${column}, ''), NFD), ${"[\u0300-\u036f]"}, '', 'g')),
  '[^[:alnum:]]+', ' ', 'g'))`;

const nameSignals = Prisma.sql`names AS (
  SELECT id, ${nameKey(Prisma.sql`"originalName"`)} AS original,
    ${nameKey(Prisma.sql`"normalizedName"`)} AS normalized FROM "Venue"
), shared AS (
  SELECT alias FROM (SELECT id, original AS alias FROM names UNION SELECT id, normalized FROM names) a
  WHERE alias <> '' GROUP BY alias HAVING count(*) > 1
), matches AS (
  SELECT v.id, n.normalized <> '' AND n.original <> n.normalized AS "differentNames",
    CASE WHEN so.alias IS NOT NULL THEN v."originalName" WHEN sn.alias IS NOT NULL THEN v."normalizedName" END AS "sharedName"
  FROM "Venue" v JOIN names n ON n.id = v.id
  LEFT JOIN shared so ON so.alias = n.original LEFT JOIN shared sn ON sn.alias = n.normalized
)`;

type NameSignal = Pick<PriorityVenue, "id" | "differentNames" | "sharedName">;

export async function pageNameSignals(tx: Prisma.TransactionClient, ids: string[]) {
  if (!ids.length) return new Map<string, NameSignal>();
  const matches = await tx.$queryRaw<NameSignal[]>`WITH ${nameSignals} SELECT * FROM matches WHERE id IN (${Prisma.join(ids)})`;
  return new Map(matches.map(match => [match.id, match]));
}

export async function loadPriorities(db: PrismaClient, params: Params) {
  const group = qualityGroups.find(([key]) => key === params.calidad)?.[0] ?? "todos";
  const requested = parsePagination(params).page;
  const size = 5;
  const predicate = {
    todos: Prisma.sql`("isPending" OR required OR suggested OR possible)`,
    required: Prisma.sql`required`, possible: Prisma.sql`possible`, suggested: Prisma.sql`suggested`,
  }[group];
  // La base agrupa alias de fichas distintas, ordena las prioridades y entrega solo cinco fichas.
  const [result] = await db.$queryRaw<{ total: number; rows: PriorityVenue[] }[]>`
    WITH ${nameSignals}, facts AS (
      SELECT v.id, v."originalName", v."normalizedName", v.city, v.category, v."isActive",
        v.address, v.location, v.latitude, v.longitude, v.description, v."reviewStatus" = 'PENDING' AS "isPending",
        trim(coalesce(nullif(v.address, ''), v.location, '')) AS street,
        (EXISTS (SELECT 1 FROM "VenueImage" i WHERE i."venueId" = v.id))::int AS "imageCount", m."differentNames", m."sharedName", v."reviewStatus"
      FROM "Venue" v JOIN matches m ON m.id = v.id
    ), signals AS (
      SELECT *, (length(street) < 3 OR street ~* '^Lat:[[:space:]]*-?[0-9]') AS "missingAddress" FROM facts
    ), classified AS (
      SELECT *, (trim(coalesce(nullif("normalizedName", ''), "originalName")) = '' OR NOT "isActive"
        OR coalesce(city, '') NOT IN (${Prisma.join(reviewCities)}) OR coalesce(category, '') NOT IN (${Prisma.join(reviewCategories)})
        OR "missingAddress") AS required,
        (latitude IS NULL OR longitude IS NULL OR latitude NOT BETWEEN ${latitudeRange.gte} AND ${latitudeRange.lte}
        OR longitude NOT BETWEEN ${longitudeRange.gte} AND ${longitudeRange.lte} OR trim(coalesce(description, '')) = ''
        OR "imageCount" = 0 OR (NOT "missingAddress" AND street !~ '[0-9]')) AS suggested,
        ("differentNames" OR "sharedName" IS NOT NULL) AS possible FROM signals
    ), eligible AS (SELECT * FROM classified WHERE ${predicate}),
    totals AS (SELECT count(*)::int AS total FROM eligible)
    SELECT total, coalesce((SELECT json_agg(p) FROM (
      SELECT id, "originalName", "normalizedName", city, category, "isActive", address, location, latitude, longitude,
        description, "imageCount", "isPending", "differentNames", "sharedName", "reviewStatus" FROM eligible
      ORDER BY "isPending" DESC, required DESC, ("differentNames"::int + ("sharedName" IS NOT NULL)::int) DESC,
        coalesce(nullif("normalizedName", ''), "originalName"), id
      LIMIT ${size} OFFSET (SELECT least(${requested - 1}::int, greatest(0, (total - 1) / ${size}::int)) * ${size} FROM totals)
    ) p), '[]'::json) AS rows FROM totals
  `;
  const { page, pages } = pageBounds(requested, size, result.total);
  return { rows: result.rows.map(describePriority), total: result.total, page, pages, group };
}
