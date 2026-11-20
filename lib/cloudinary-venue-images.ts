import "server-only";

import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import {
  isSalimoVenueImagePublicId,
} from "./venue-image-constants.ts";
import { createCloudinaryVenueImageUploadOptions } from "./cloudinary-venue-image-options.ts";
import {
  deleteAndVerifyCloudinaryVenueImage,
} from "./cloudinary-venue-image-deletion.ts";

function configureCloudinary(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return false;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return true;
}

export function cloudinaryConfigured(): boolean {
  return [
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ].every((value) => Boolean(value?.trim()));
}

export async function uploadCloudinaryVenueImage(input: {
  venueId: string;
  bytes: Uint8Array;
  mimeType: string;
}): Promise<{ secureUrl: string; publicId: string }> {
  if (!configureCloudinary()) throw new Error("Cloudinary is not configured");
  const options = createCloudinaryVenueImageUploadOptions(input.venueId, randomUUID());
  const publicId = options.public_id;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error || !result) {
          reject(new Error("Cloudinary upload failed"));
          return;
        }
        if (
          result.public_id !== publicId ||
          !isSalimoVenueImagePublicId(result.public_id, input.venueId)
        ) {
          reject(new Error("Cloudinary returned an unexpected public ID"));
          return;
        }
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      },
    );
    Readable.from([Buffer.from(input.bytes)]).pipe(stream);
  });
}

export async function deleteCloudinaryVenueImage(
  publicId: string,
  venueId: string,
): Promise<void> {
  if (!isSalimoVenueImagePublicId(publicId, venueId)) {
    throw new Error("Invalid SALIMO venue image identifier");
  }
  if (!configureCloudinary()) throw new Error("Cloudinary is not configured");
  await deleteAndVerifyCloudinaryVenueImage(publicId, venueId, {
    destroy: (id, options) => cloudinary.uploader.destroy(id, options),
    resource: (id, options) => cloudinary.api.resource(id, options),
  });
}
