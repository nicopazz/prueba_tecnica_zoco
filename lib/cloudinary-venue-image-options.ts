import {
  isSalimoVenueImagePublicId,
  venueImageAssetFolder,
} from "./venue-image-constants.ts";

export function createCloudinaryVenueImageUploadOptions(
  venueId: string,
  uniqueId: string,
) {
  const assetFolder = venueImageAssetFolder(venueId);
  const publicId = `${assetFolder}/${uniqueId}`;
  if (!isSalimoVenueImagePublicId(publicId, venueId)) {
    throw new Error("Invalid SALIMO venue image identifier");
  }

  return {
    public_id: publicId,
    asset_folder: assetFolder,
    resource_type: "image" as const,
    overwrite: false,
    unique_filename: false,
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  };
}
