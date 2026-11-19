import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminVenueEditor from "@/app/components/AdminVenueEditor";
import { venueSchemaReady } from "@/lib/public-venues";
import { adminVisualPreview } from "@/lib/admin-visual-preview";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volver?: string }>;
};
export default async function EditVenue({ params, searchParams }: Props) {
  const { id } = await params;
  const { volver } = await searchParams;
  const returnTo = volver === "revision" ? "/admin/revision" : "/admin/locales";
  if (adminVisualPreview())
    return (
      <main className="admin-editor-page">
        <Link href={returnTo} className="admin-back-link">
          {volver === "revision" ? "Volver a revisión" : "Volver a locales"}
        </Link>
        <p className="admin-empty">
          No hay un establecimiento cargado: la edición requiere una conexión de
          desarrollo a PostgreSQL.
        </p>
      </main>
    );
  const ready = await venueSchemaReady();
  const basicSelect = {
    id: true,
    normalizedName: true,
    originalName: true,
    location: true,
    category: true,
    isActive: true,
  } as const;
  const venue = await (ready
    ? prisma.venue.findUnique({
        where: { id },
        select: {
          ...basicSelect,
          slug: true,
          city: true,
          address: true,
          latitude: true,
          longitude: true,
          description: true,
          phone: true,
          whatsapp: true,
          instagram: true,
          website: true,
          openingHours: true,
          isFeatured: true,
          publicationStatus: true,
          reviewStatus: true,
          images: {
            select: {
              id: true,
              imageUrl: true,
              alt: true,
              attribution: true,
              license: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      })
    : prisma.venue.findUnique({ where: { id }, select: basicSelect })).catch(() => undefined);
  if (venue === undefined) return <main className="admin-editor-page">
    <Link href={returnTo} className="admin-back-link">{volver === "revision" ? "Volver a revisión" : "Volver a locales"}</Link>
    <section role="alert" className="admin-empty"><p>No se pudo cargar la ficha. Revisá la conexión y volvé a intentar.</p>
      <a className="admin-action-secondary" href="">Reintentar</a></section>
  </main>;
  if (!venue) notFound();
  return (
    <main className="admin-editor-page">
      <Link href={returnTo} className="admin-back-link">
        {volver === "revision" ? "Volver a revisión" : "Volver a locales"}
      </Link>
      <AdminVenueEditor schemaReady={ready} venue={venue} returnTo={returnTo} />
    </main>
  );
}
