import { prisma } from "@/lib/prisma";
import { venueSchemaReady } from "@/lib/public-venues";
import { fetchOverpass } from "./overpass";
import { classifyNewVenues } from "./ai";

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

type SyncResult = {
  encontrados: number;
  creados: number;
  actualizados: number;
  sinCambios: number;
  conflictos: number;
  iaUtilizada: boolean;
  advertencias: string[];
};

async function executeSync(schemaReady: boolean): Promise<SyncResult> {
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

  const counts = await prisma.$transaction(async tx => {
    const locked = await tx.$queryRawUnsafe<Array<{ locked: boolean }>>(
      "SELECT pg_try_advisory_xact_lock(20261116) AS locked"
    );
    if (!locked[0]?.locked) throw new ConcurrentSyncError();
    const count = { creados: 0, actualizados: 0, sinCambios: 0, conflictos: 0 };
    for (const row of rows) {
      const found = await tx.venue.findFirst({
        where: { source: row.osmKey },
        select: { id: true, originalName: true },
      });
      if (found) {
        // Respeta nombre editado, categoría, ubicación y publicación manual.
        if (found.originalName !== row.originalName) {
          await tx.venue.update({ where: { id: found.id }, data: { originalName: row.originalName }, select: { id: true } });
          count.actualizados++;
        } else count.sinCambios++;
        continue;
      }

      const legacy = await tx.venue.findMany({
        where: {
          source: "Overpass API",
          originalName: { equals: row.originalName, mode: "insensitive" },
        },
        select: { id: true, location: true },
        take: 2,
      });
      if (legacy.length === 1 && samePlace(legacy[0].location, row.location)) {
        await tx.venue.update({
          where: { id: legacy[0].id },
          data: { source: row.osmKey, originalName: row.originalName },
          select: { id: true },
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
          originalName: row.originalName, normalizedName: proposal.normalizedName,
          location: row.location, category: proposal.category, source: row.osmKey,
          confidence: proposal.confidence, isActive: true,
          ...(schemaReady ? {
            latitude: row.latitude, longitude: row.longitude, city: row.city,
            address: row.address, coordinateSource: row.latitude === null ? null : "OSM_CENTER",
          } : {}),
          // Nunca publicar automáticamente los locales importados.
        },
        select: { id: true },
      });
      count.creados++;
    }
    return count;
  }, { maxWait: 3000, timeout: 45000 });
  return { encontrados: rows.length, ...counts, iaUtilizada: ai.usedAi, advertencias: ai.warnings };
}

export async function runSync(triggeredBy: "MANUAL" | "CRON" | "TOKEN" = "TOKEN"): Promise<SyncResult> {
  const schemaReady = await venueSchemaReady();
  let historyId: string | null = null;
  if (schemaReady) {
    try {
      const history = await prisma.syncRun.create({
        data: { status: "RUNNING", triggeredBy }, select: { id: true },
      });
      historyId = history.id;
    } catch (error) {
      console.error("No se pudo iniciar el registro de sincronización:", error);
    }
  }

  try {
    const result = await executeSync(schemaReady);
    if (historyId) {
      try {
        await prisma.syncRun.update({
          where: { id: historyId },
          data: { status: "SUCCESS", finishedAt: new Date(),
            foundCount: result.encontrados, createdCount: result.creados,
            updatedCount: result.actualizados, conflictCount: result.conflictos,
            warnings: result.advertencias },
          select: { id: true },
        });
      } catch (error) { console.error("No se pudo registrar el resultado de sincronización:", error); }
    }
    return result;
  } catch (error) {
    if (historyId) {
      try {
        await prisma.syncRun.update({
          where: { id: historyId },
          data: { status: "FAILED", finishedAt: new Date(), errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Error desconocido" },
          select: { id: true },
        });
      } catch (historyError) { console.error("No se pudo registrar el fallo de sincronización:", historyError); }
    }
    throw error;
  }
}
