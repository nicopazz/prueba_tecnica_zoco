import Link from "next/link";
import type { PublicVenue } from "@/lib/public-venues";
import { venueDisplayName } from "@/lib/public-venues";
import { cloudinaryImageSrcSet, cloudinaryImageUrl } from "@/lib/cloudinary-image-url";

export default function PublicVenueCard({ venue }: { venue: PublicVenue }) {
  const firstImage = venue.images[0];
  return (
    <article className="public-venue-card overflow-hidden rounded-xl border border-gray-200 bg-white">
      {firstImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cloudinaryImageUrl(firstImage.imageUrl, firstImage.publicId, 640)}
            srcSet={cloudinaryImageSrcSet(firstImage.imageUrl, firstImage.publicId)}
            sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw"
            alt={firstImage.alt || venueDisplayName(venue)}
            loading="lazy"
            decoding="async"
            className="h-40 w-full object-cover"
          />
          {firstImage.attribution ? (
            <p className="px-4 pt-1 text-xs text-gray-500">
              Foto: {firstImage.attribution}
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex h-24 items-center justify-center bg-gray-100 text-sm text-gray-500">Sin fotografía</div>
      )}
      <div className="space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{venue.category || "Local"} · {venue.city || "Tucumán"}</p>
        <h2 className="text-lg font-semibold">{venueDisplayName(venue)}</h2>
        <p className="text-sm text-gray-600">{venue.address || venue.location || "Ubicación por confirmar"}</p>
        <Link href={`/lugares/${venue.slug}`} className="inline-block text-sm font-semibold underline underline-offset-4">Ver local</Link>
      </div>
    </article>
  );
}
