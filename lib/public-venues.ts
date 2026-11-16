import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const venueSchemaReady = cache(async (): Promise<boolean> => {
  try {
    const result = await prisma.$queryRaw<Array<{ ready: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Venue'
          AND column_name = 'publicationStatus'
      ) AS ready
    `;
    return result[0]?.ready === true;
  } catch (error) {
    console.error("No se pudo comprobar el esquema público:", error);
    return false;
  }
});

export const publicVenueSelect = {
  id: true,
  originalName: true,
  normalizedName: true,
  category: true,
  location: true,
  slug: true,
  city: true,
  address: true,
  latitude: true,
  longitude: true,
  description: true,
  instagram: true,
  whatsapp: true,
  phone: true,
  website: true,
  openingHours: true,
  isFeatured: true,
  images: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, imageUrl: true, alt: true, attribution: true, license: true },
    take: 8,
  },
} as const;

export type PublicVenue = Prisma.VenueGetPayload<{ select: typeof publicVenueSelect }>;
export const venueDisplayName = (venue: { normalizedName: string | null; originalName: string }) =>
  venue.normalizedName || venue.originalName;

export const validCategories = ["Bar", "Pub", "Cervecería"] as const;
export const validCities = ["San Miguel de Tucumán", "Yerba Buena"] as const;

export type PublicVenueFilters = { q?: string; city?: string; category?: string };
export async function listPublicVenues(filters: PublicVenueFilters = {}): Promise<PublicVenue[]> {
  if (!(await venueSchemaReady())) return [];
  const q = (filters.q || "").trim().slice(0, 70);
  const city = validCities.find((value) => value === filters.city);
  const category = validCategories.find((value) => value === filters.category);
  const where: Prisma.VenueWhereInput = {
    isActive: true,
    publicationStatus: "PUBLISHED",
    category: category ? category : { in: [...validCategories] },
    ...(city ? { city } : {}),
    ...(q ? { OR: [
      { normalizedName: { contains: q, mode: "insensitive" } },
      { originalName: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };
  return prisma.venue.findMany({
    where,
    select: publicVenueSelect,
    orderBy: [{ isFeatured: "desc" }, { normalizedName: "asc" }],
    take: 100,
  });
}

export async function getPublicVenue(slug: string): Promise<PublicVenue | null> {
  if (!(await venueSchemaReady())) return null;
  if (slug.length > 180) return null;
  return prisma.venue.findFirst({
    where: { slug, isActive: true, publicationStatus: "PUBLISHED" },
    select: publicVenueSelect,
  });
}
