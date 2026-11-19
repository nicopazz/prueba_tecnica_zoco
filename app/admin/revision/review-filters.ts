import type { Prisma } from "@prisma/client";

export const states = {
  pendientes: { reviewStatus: "PENDING" },
  revisados: { reviewStatus: "REVIEWED", publicationStatus: { not: "PUBLISHED" } },
  publicados: { publicationStatus: "PUBLISHED" },
  todos: {},
} satisfies Record<string, Prisma.VenueWhereInput>;

export function reviewState(value: unknown): keyof typeof states {
  return typeof value === "string" && Object.hasOwn(states, value) ? value as keyof typeof states : "pendientes";
}

export function reviewTotals(groups: { reviewStatus: string; publicationStatus: string; _count: number }[]) {
  const totals = { pendientes: 0, revisados: 0, publicados: 0, todos: 0 };
  for (const group of groups) {
    totals.todos += group._count;
    if (group.reviewStatus === "PENDING") totals.pendientes += group._count;
    if (group.publicationStatus === "PUBLISHED") totals.publicados += group._count;
    else if (group.reviewStatus === "REVIEWED") totals.revisados += group._count;
  }
  return totals;
}
