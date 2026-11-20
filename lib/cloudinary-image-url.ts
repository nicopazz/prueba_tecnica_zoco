const CLOUDINARY_HOST = "res.cloudinary.com";
const DELIVERY_WIDTHS = [320, 640, 960, 1280, 1600] as const;

export function cloudinaryImageUrl(
  imageUrl: string,
  publicId: string | null | undefined,
  width: number,
): string {
  if (!publicId) return imageUrl;
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== CLOUDINARY_HOST || url.protocol !== "https:") return imageUrl;
    const marker = "/image/upload/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return imageUrl;
    const safeWidth = Math.max(160, Math.min(1600, Math.round(width)));
    url.pathname = `${url.pathname.slice(0, markerIndex + marker.length)}f_auto,q_auto,c_limit,w_${safeWidth}/${url.pathname.slice(markerIndex + marker.length)}`;
    return url.toString();
  } catch {
    return imageUrl;
  }
}

export function cloudinaryImageSrcSet(
  imageUrl: string,
  publicId: string | null | undefined,
): string | undefined {
  if (!publicId) return undefined;
  return DELIVERY_WIDTHS
    .map((width) => `${cloudinaryImageUrl(imageUrl, publicId, width)} ${width}w`)
    .join(", ");
}
