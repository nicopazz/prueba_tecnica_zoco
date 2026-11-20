import "server-only";

import { prisma } from "./prisma";
import { venueSchemaReady } from "./public-venues";
import {
  cloudinaryConfigured,
  deleteCloudinaryVenueImage,
  uploadCloudinaryVenueImage,
} from "./cloudinary-venue-images";
import {
  createVenueImageHandlers,
  VenueImageLimitError,
  VenueNotFoundError,
} from "./venue-image-handlers";
import { MAX_VENUE_IMAGES } from "./venue-image-constants";

export const venueImageHandlers = createVenueImageHandlers({
  schemaReady: venueSchemaReady,
  storageConfigured: cloudinaryConfigured,
  venueExists: async (venueId) =>
    Boolean(await prisma.venue.findUnique({ where: { id: venueId }, select: { id: true } })),
  imageCount: (venueId) => prisma.venueImage.count({ where: { venueId } }),
  createImage: (data) =>
    prisma.$transaction(async (transaction) => {
      const venues = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Venue" WHERE "id" = ${data.venueId} FOR UPDATE
      `;
      if (!venues.length) throw new VenueNotFoundError();
      const count = await transaction.venueImage.count({ where: { venueId: data.venueId } });
      if (count >= MAX_VENUE_IMAGES) throw new VenueImageLimitError();
      const highestOrder = await transaction.venueImage.aggregate({
        where: { venueId: data.venueId },
        _max: { sortOrder: true },
      });
      return transaction.venueImage.create({
        data: {
          ...data,
          sortOrder: (highestOrder._max.sortOrder ?? -1) + 1,
        },
        select: { id: true },
      });
    }),
  findImage: async (venueId, imageId) => {
    const image = await prisma.venueImage.findFirst({
      where: { venueId, id: imageId },
      select: { publicId: true },
    });
    return image ?? null;
  },
  deleteImage: async (venueId, imageId) =>
    (await prisma.venueImage.deleteMany({ where: { venueId, id: imageId } })).count === 1,
  uploadImage: uploadCloudinaryVenueImage,
  destroyImage: deleteCloudinaryVenueImage,
});
