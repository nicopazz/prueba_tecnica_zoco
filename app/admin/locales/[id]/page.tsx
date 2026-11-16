import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminVenueEditor from "@/app/components/AdminVenueEditor";
import { venueSchemaReady } from "@/lib/public-venues";

type Props = { params: Promise<{ id: string }> };
export default async function EditVenue({ params }: Props) {
  const { id } = await params;
  const ready = await venueSchemaReady();
  const basicSelect = {
    id: true, normalizedName: true, originalName: true,
    location: true, category: true, isActive: true,
  } as const;
  const venue = ready
    ? await prisma.venue.findUnique({ where: { id }, select: {
        ...basicSelect, slug: true, city: true, address: true,
        latitude: true, longitude: true, description: true,
        phone: true, whatsapp: true, instagram: true, website: true,
        openingHours: true, isFeatured: true, publicationStatus: true,
        reviewStatus: true,
        images: { select: {
          id: true, imageUrl: true, alt: true, attribution: true, license: true,
        }, orderBy: { sortOrder: "asc" } },
      } })
    : await prisma.venue.findUnique({ where: { id }, select: basicSelect });
  if (!venue) notFound();
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-9">
      <Link href="/admin/locales" className="text-sm underline">Volver a locales</Link>
      <h1 className="text-3xl font-bold">Editar establecimiento</h1>
      <AdminVenueEditor schemaReady={ready} venue={venue} />
    </main>
  );
}
