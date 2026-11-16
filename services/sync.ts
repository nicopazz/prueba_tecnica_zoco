import { prisma } from "@/lib/prisma";
import { fetchOverpass } from "./overpass";
import { classifyNewVenues } from "./ai";

// Evita asociar un OSM distinto con un registro antiguo solo por compartir el nombre.
function samePlace(previous: string, current: string): boolean {
  if (previous.trim().toLocaleLowerCase() === current.trim().toLocaleLowerCase()) return true;
  const coordinates = /^Lat:\s*(-?\d+(?:\.\d+)?),\s*Lon:\s*(-?\d+(?:\.\d+)?)$/i;
  const before = coordinates.exec(previous);
  const after = coordinates.exec(current);
  return !!before && !!after &&
    Math.abs(Number(before[1]) - Number(after[1])) < 0.00015 &&
    Math.abs(Number(before[2]) - Number(after[2])) < 0.00015;
}

export class ConcurrentSyncError extends Error {
  constructor() { super("Otra sincronización está guardando registros."); }
}

export async function runSync() {
  const rows = await fetchOverpass();
  if (rows.length === 0) {
    return { encontrados: 0, creados: 0, actualizados: 0, sinCambios: 0, conflictos: 0, iaUtilizada: false,
      advertencias: ["No se encontraron locales: la base de datos no se modificó."] };
  }

  const existing = await prisma.venue.findMany({
    where: { source: { in: rows.map(row => row.osmKey) } },
    select: { source: true },
  });
  const existingKeys = new Set(existing.map(row => row.source));
  const newRows = rows.filter(row => !existingKeys.has(row.osmKey));
  const ai = await classifyNewVenues(newRows);
  const classified = new Map(ai.venues.map(row => [row.osmKey, row]));

  // Bloqueo transaccional en la base de datos, válido entre instancias serverless.
  // Si alguna escritura falla, se revierte toda la ejecución.
  const counts = await prisma.$transaction(async tx => {
    // SQL constante sin datos provenientes del usuario.
    const locked = await tx.$queryRawUnsafe<Array<{ locked: boolean }>>(
      "SELECT pg_try_advisory_xact_lock(20261116) AS locked"
    );
    if (!locked[0]?.locked) throw new ConcurrentSyncError();
    const count = { creados: 0, actualizados: 0, sinCambios: 0, conflictos: 0 };
    for (const row of rows) {
      const found = await tx.venue.findFirst({ where: { source: row.osmKey } });
      if (found) {
        // Preserva las correcciones hechas desde el dashboard.
        if (found.originalName !== row.originalName) {
          await tx.venue.update({
            where: { id: found.id }, data: { originalName: row.originalName },
          });
          count.actualizados++;
        } else count.sinCambios++;
        continue;
      }

      // Vincula registros importados antes de guardar los IDs de OSM.
      const legacy = await tx.venue.findMany({
        where: {
          source: "Overpass API",
          originalName: { equals: row.originalName, mode: "insensitive" },
        },
        take: 2,
      });
      if (legacy.length === 1 && samePlace(legacy[0].location, row.location)) {
        await tx.venue.update({
          where: { id: legacy[0].id },
          data: { source: row.osmKey, originalName: row.originalName },
        });
        count.actualizados++;
        continue;
      }
      if (legacy.length > 0) { count.conflictos++; continue; }

      const proposal = classified.get(row.osmKey) ?? {
        ...row, normalizedName: row.originalName, confidence: 50,
      };
      const collision = await tx.venue.findFirst({
        where: {
          normalizedName: { equals: proposal.normalizedName, mode: "insensitive" },
          location: { equals: row.location, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (collision) { count.conflictos++; continue; }

      await tx.venue.create({
        data: {
          originalName: row.originalName,
          normalizedName: proposal.normalizedName,
          location: row.location,
          category: proposal.category,
          source: row.osmKey,
          confidence: proposal.confidence,
          isActive: true,
        },
      });
      count.creados++;
    }
    return count;
  }, { maxWait: 3000, timeout: 45000 });
  return { encontrados: rows.length, ...counts, iaUtilizada: ai.usedAi, advertencias: ai.warnings };
}
