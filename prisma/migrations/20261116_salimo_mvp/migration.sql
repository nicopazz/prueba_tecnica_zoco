-- SALIMO. - Migración aditiva para bases existentes. Mantiene todos los datos.
-- En una instalación nueva crea el modelo base y luego agrega los campos del MVP.
-- En Neon Production: aplicar SOLO con respaldo comprobado.

CREATE TABLE IF NOT EXISTS "Venue" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "normalizedName" TEXT,
    "location" TEXT NOT NULL,
    "category" TEXT,
    "source" TEXT NOT NULL,
    "confidence" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Venue_normalizedName_location_key" ON "Venue"("normalizedName", "location");

ALTER TABLE "Venue" ADD COLUMN "slug" TEXT;
ALTER TABLE "Venue" ADD COLUMN "city" TEXT;
ALTER TABLE "Venue" ADD COLUMN "address" TEXT;
ALTER TABLE "Venue" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Venue" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Venue" ADD COLUMN "description" TEXT;
ALTER TABLE "Venue" ADD COLUMN "phone" TEXT;
ALTER TABLE "Venue" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "Venue" ADD COLUMN "instagram" TEXT;
ALTER TABLE "Venue" ADD COLUMN "website" TEXT;
ALTER TABLE "Venue" ADD COLUMN "openingHours" TEXT;
ALTER TABLE "Venue" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Venue" ADD COLUMN "publicationStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Venue" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Venue" ADD COLUMN "lastReviewedAt" TIMESTAMP(3);
ALTER TABLE "Venue" ADD COLUMN "coordinateSource" TEXT;

CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");
CREATE INDEX "Venue_publicationStatus_isActive_idx" ON "Venue"("publicationStatus", "isActive");
CREATE INDEX "Venue_city_category_idx" ON "Venue"("city", "category");

CREATE TABLE "VenueImage" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "publicId" TEXT,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "attribution" TEXT,
    "license" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VenueImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VenueImage_venueId_sortOrder_idx" ON "VenueImage"("venueId", "sortOrder");
ALTER TABLE "VenueImage" ADD CONSTRAINT "VenueImage_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "foundCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB,
    "errorMessage" TEXT,
    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);
