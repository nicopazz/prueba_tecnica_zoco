import type { PrismaClient } from "@prisma/client";
import { reviewChecklist, type ReviewVenue } from "./venue-review.ts";
import type { MapVenue } from "../app/components/PublicMap";

type CatalogGroup = { category: string | null; isActive: boolean; publicationStatus: string; reviewStatus: string; _count: number };

export function summarizeCatalog(groups: CatalogGroup[], points: MapVenue[]) {
  const categories = new Map<string, number>();
  let total = 0, active = 0, pending = 0, published = 0;
  for (const group of groups) {
    const count = group._count;
    const category = group.category?.trim() || "Sin clasificar";
    categories.set(category, (categories.get(category) ?? 0) + count);
    total += count;
    if (group.isActive) active += count;
    if (group.reviewStatus === "PENDING") pending += count;
    if (group.publicationStatus === "PUBLISHED") published += count;
  }
  const distribution = Array.from(categories, ([category, count]) => ({
    category, count, percent: 100 * count / total,
  })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, "es"));
  return { total, active, pending, published, unlocated: total - points.length, distribution, points };
}

export type PriorityVenue = ReviewVenue & {
  id: string; isPending: boolean; reviewStatus: string; sharedName: string | null; differentNames: boolean;
};

export function describePriority(venue: PriorityVenue) {
  const { required, suggested } = reviewChecklist(venue);
  const address = (venue.address || venue.location).trim();
  if (address && !/\d/.test(address) && !required.includes("Falta dirección verificable")) {
    suggested.push("Confirmar altura o referencia de la dirección");
  }
  const possible: string[] = [];
  if (venue.differentNames) possible.push("Comprobar nombre original: " + venue.originalName);
  if (venue.sharedName) possible.push("Posible duplicado: otro registro comparte el nombre «" + venue.sharedName + "»");
  return { id: venue.id, name: venue.normalizedName || venue.originalName, href: "/admin/locales/" + encodeURIComponent(venue.id),
    isPending: venue.isPending, reviewStatus: venue.reviewStatus, required, possible, suggested };
}

export const recentFailureStart = (now: Date) => new Date(now.getTime() - 7 * 86_400_000);

export type VenueSummary = ReturnType<typeof summarizeCatalog>;

export async function readSyncSummary(db: PrismaClient, now = new Date()) {
  const orderBy = [{ startedAt: "desc" }, { id: "desc" }] as const;
  const [activity, success, failures, lastError] = await db.$transaction([
    db.syncRun.findMany({ orderBy: [...orderBy], take: 3,
      select: { id: true, startedAt: true, status: true, triggeredBy: true } }),
    db.syncRun.findFirst({ where: { status: "SUCCESS" }, orderBy: [{ finishedAt: { sort: "desc", nulls: "last" } }, ...orderBy],
      select: { startedAt: true, finishedAt: true } }),
    db.syncRun.count({ where: { status: "FAILED", startedAt: { gte: recentFailureStart(now), lte: now } } }),
    db.syncRun.findFirst({ where: { status: "FAILED", errorMessage: { not: "" } }, orderBy: [...orderBy],
      select: { errorMessage: true, startedAt: true } }),
  ], { isolationLevel: "RepeatableRead" });
  return { activity, lastSuccess: success?.finishedAt ?? success?.startedAt ?? null, failures, lastError };
}
