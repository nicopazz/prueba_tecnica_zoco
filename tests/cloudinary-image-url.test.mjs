import assert from "node:assert/strict";
import test from "node:test";
import {
  cloudinaryImageSrcSet,
  cloudinaryImageUrl,
} from "../lib/cloudinary-image-url.ts";

test("Cloudinary public images use responsive automatic format and quality transformations", () => {
  const image = "https://res.cloudinary.com/salimo/image/upload/v123/venues/place/photo.jpg";
  const transformed = cloudinaryImageUrl(image, "venues/place/photo", 640);

  assert.match(transformed, /\/image\/upload\/f_auto,q_auto,c_limit,w_640\/v123\//);
  assert.match(cloudinaryImageSrcSet(image, "venues/place/photo") || "", /320w/);
  assert.match(cloudinaryImageSrcSet(image, "venues/place/photo") || "", /1600w/);
});

test("las fotografías externas y Cloudinary no administradas conservan su URL original", () => {
  const external = "https://images.example/photo.webp";
  const cloudinary = "https://res.cloudinary.com/salimo/image/upload/v123/photo.jpg";

  assert.equal(cloudinaryImageUrl(external, null, 640), external);
  assert.equal(cloudinaryImageSrcSet(external, null), undefined);
  assert.equal(cloudinaryImageUrl(cloudinary, null, 640), cloudinary);
});
