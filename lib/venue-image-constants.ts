export const MAX_VENUE_IMAGES = 5;
export const MAX_VENUE_IMAGE_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_VENUE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const SALIMO_VENUE_IMAGES_FOLDER = "salimo/venues";

const VENUE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;
const VENUE_IMAGE_PUBLIC_ID_PATTERN =
  /^salimo\/venues\/([a-zA-Z0-9_-]{1,80})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export function isValidVenueImageVenueId(venueId: string): boolean {
  return VENUE_ID_PATTERN.test(venueId);
}

export function venueImageAssetFolder(venueId: string): string {
  if (!isValidVenueImageVenueId(venueId)) {
    throw new Error("Invalid venue identifier");
  }
  return `${SALIMO_VENUE_IMAGES_FOLDER}/${venueId}`;
}

export function isSalimoVenueImagePublicId(
  publicId: unknown,
  venueId?: string,
): publicId is string {
  if (typeof publicId !== "string") return false;
  const match = VENUE_IMAGE_PUBLIC_ID_PATTERN.exec(publicId);
  return Boolean(
    match &&
      (venueId === undefined ||
        (isValidVenueImageVenueId(venueId) && match[1] === venueId)),
  );
}
