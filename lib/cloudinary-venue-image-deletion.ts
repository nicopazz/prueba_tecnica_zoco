import { isSalimoVenueImagePublicId } from "./venue-image-constants.ts";

type CloudinaryDeleteOptions = {
  resource_type: "image";
  type: "upload";
  invalidate: true;
};

type CloudinaryResourceOptions = {
  resource_type: "image";
  type: "upload";
};

export type CloudinaryVenueImageDeletionClient = {
  destroy(
    publicId: string,
    options: CloudinaryDeleteOptions,
  ): Promise<{ result?: unknown }>;
  resource(
    publicId: string,
    options: CloudinaryResourceOptions,
  ): Promise<unknown>;
};

const DELETE_OPTIONS: CloudinaryDeleteOptions = {
  resource_type: "image",
  type: "upload",
  invalidate: true,
};

const RESOURCE_OPTIONS: CloudinaryResourceOptions = {
  resource_type: "image",
  type: "upload",
};

const MAX_DELETE_ATTEMPTS = 5;
const DELETE_RETRY_DELAY_MS = 500;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : null;
}

function httpStatus(error: unknown): number | undefined {
  const outer = asRecord(error);
  const nested = asRecord(outer?.error);
  const response = asRecord(outer?.response);
  const status = [
    outer?.http_code,
    outer?.statusCode,
    nested?.http_code,
    nested?.statusCode,
    response?.status,
  ].find((value): value is number => typeof value === "number");
  return status;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function deleteAndVerifyCloudinaryVenueImage(
  publicId: string,
  venueId: string,
  client: CloudinaryVenueImageDeletionClient,
  pause: (milliseconds: number) => Promise<void> = wait,
): Promise<void> {
  if (!isSalimoVenueImagePublicId(publicId, venueId)) {
    throw new Error("Invalid SALIMO venue image identifier");
  }

  for (let attempt = 0; attempt < MAX_DELETE_ATTEMPTS; attempt++) {
    let result: { result?: unknown };
    try {
      result = await client.destroy(publicId, { ...DELETE_OPTIONS });
    } catch (error) {
      if (httpStatus(error) !== 404) {
        throw new Error("Cloudinary delete failed");
      }
      result = { result: "not found" };
    }

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error("Cloudinary delete failed");
    }

    try {
      await client.resource(publicId, { ...RESOURCE_OPTIONS });
    } catch (error) {
      if (httpStatus(error) === 404) return;
      throw new Error("Cloudinary deletion could not be verified");
    }

    if (attempt < MAX_DELETE_ATTEMPTS - 1) {
      await pause(DELETE_RETRY_DELAY_MS);
    }
  }

  throw new Error("Cloudinary deletion could not be verified");
}
