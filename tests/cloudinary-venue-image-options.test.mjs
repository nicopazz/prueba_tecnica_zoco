import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createCloudinaryVenueImageUploadOptions } from "../lib/cloudinary-venue-image-options.ts";
import { isSalimoVenueImagePublicId } from "../lib/venue-image-constants.ts";

test("builds unique, non-overwriting IDs and folders inside the SALIMO namespace", () => {
  const first = createCloudinaryVenueImageUploadOptions("venue-1", randomUUID());
  const second = createCloudinaryVenueImageUploadOptions("venue-1", randomUUID());

  assert.notEqual(first.public_id, second.public_id);
  for (const options of [first, second]) {
    assert.match(
      options.public_id,
      /^salimo\/venues\/venue-1\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u,
    );
    assert.equal(options.asset_folder, "salimo/venues/venue-1");
    assert.equal(options.overwrite, false);
    assert.equal(options.unique_filename, false);
    assert.equal(options.resource_type, "image");
  }
});

test("rejects malformed, other-venue, and external public IDs", () => {
  assert.equal(
    isSalimoVenueImagePublicId(
      "salimo/venues/venue-1/123e4567-e89b-42d3-a456-426614174000",
      "venue-1",
    ),
    true,
  );
  assert.equal(
    isSalimoVenueImagePublicId(
      "salimo/venues/venue-2/123e4567-e89b-42d3-a456-426614174000",
      "venue-1",
    ),
    false,
  );
  assert.equal(isSalimoVenueImagePublicId("other-project/venue-1/photo", "venue-1"), false);
  assert.equal(
    isSalimoVenueImagePublicId("salimo/venues/venue-1/nested/photo", "venue-1"),
    false,
  );
  assert.equal(
    isSalimoVenueImagePublicId(
      "salimo/venues/venue-1/123e4567-e89b-42d3-a456-426614174000",
      "",
    ),
    false,
  );
  assert.equal(
    isSalimoVenueImagePublicId(
      "SALIMO/venues/venue-1/123e4567-e89b-42d3-a456-426614174000",
      "venue-1",
    ),
    false,
  );
});
