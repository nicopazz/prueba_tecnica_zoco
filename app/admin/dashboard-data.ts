import { prisma } from "@/lib/prisma";
import { latitudeRange, longitudeRange } from "@/lib/venue-coordinates";
import { readSyncSummary, summarizeCatalog } from "@/lib/dashboard";

export async function loadVenueSummary() {
  const totals = prisma.venue.groupBy({ by: ["category", "isActive", "reviewStatus", "publicationStatus"], _count: true });
  const [groups, venues] = await prisma.$transaction([
    totals,
    prisma.venue.findMany({ where: { latitude: latitudeRange, longitude: longitudeRange },
      select: { id: true, originalName: true, normalizedName: true, latitude: true, longitude: true, city: true, category: true },
      orderBy: { id: "asc" } }),
  ], { isolationLevel: "RepeatableRead" });
  return summarizeCatalog(groups, venues.map(v => ({ id: v.id, name: v.normalizedName || v.originalName,
    href: "/admin/locales/" + encodeURIComponent(v.id), lat: v.latitude!, lng: v.longitude!, city: v.city ?? "", category: v.category ?? "" })));
}

export function loadSyncSummary() {
  return readSyncSummary(prisma);
}

export type SyncSummary = Awaited<ReturnType<typeof loadSyncSummary>>;
