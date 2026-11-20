import assert from "node:assert/strict";
import test from "node:test";
import { deleteAndVerifyCloudinaryVenueImage } from "../lib/cloudinary-venue-image-deletion.ts";

const publicId = "salimo/venues/venue-1/123e4567-e89b-42d3-a456-426614174000";
const destroyOptions = {
  resource_type: "image",
  type: "upload",
  invalidate: true,
};
const resourceOptions = {
  resource_type: "image",
  type: "upload",
};

function missingResourceError(httpCode = 404) {
  return { error: { http_code: httpCode, message: "Not found" } };
}

test("verifies successful destroy through the Admin API with explicit asset type options", async () => {
  const destroyCalls = [];
  const resourceCalls = [];
  await deleteAndVerifyCloudinaryVenueImage(publicId, "venue-1", {
    destroy: async (...args) => { destroyCalls.push(args); return { result: "ok" }; },
    resource: async (...args) => { resourceCalls.push(args); throw missingResourceError(); },
  });

  assert.deepEqual(destroyCalls, [[publicId, destroyOptions]]);
  assert.deepEqual(resourceCalls, [[publicId, resourceOptions]]);
});

test("accepts an already missing asset only after Admin API confirms 404", async () => {
  let resourceCalls = 0;
  await deleteAndVerifyCloudinaryVenueImage(publicId, "venue-1", {
    destroy: async () => ({ result: "not found" }),
    resource: async () => {
      resourceCalls++;
      throw Object.assign(new Error("Not found"), { http_code: 404 });
    },
  });

  assert.equal(resourceCalls, 1);
});

test("retries destroy while the Admin API still reports the asset", async () => {
  let destroyCalls = 0;
  let resourceCalls = 0;
  const pauses = [];
  await deleteAndVerifyCloudinaryVenueImage(
    publicId,
    "venue-1",
    {
      destroy: async () => ({ result: ++destroyCalls === 1 ? "ok" : "not found" }),
      resource: async () => {
        if (++resourceCalls === 1) return { public_id: publicId };
        throw missingResourceError();
      },
    },
    async (milliseconds) => { pauses.push(milliseconds); },
  );

  assert.equal(destroyCalls, 2);
  assert.equal(resourceCalls, 2);
  assert.deepEqual(pauses, [500]);
});

test("fails after a bounded number of attempts if the Admin API still finds the asset", async () => {
  let destroyCalls = 0;
  let resourceCalls = 0;
  const pauses = [];
  await assert.rejects(
    deleteAndVerifyCloudinaryVenueImage(
      publicId,
      "venue-1",
      {
        destroy: async () => { destroyCalls++; return { result: "ok" }; },
        resource: async () => { resourceCalls++; return { public_id: publicId }; },
      },
      async (milliseconds) => { pauses.push(milliseconds); },
    ),
    /could not be verified/,
  );

  assert.equal(destroyCalls, 5);
  assert.equal(resourceCalls, 5);
  assert.deepEqual(pauses, [500, 500, 500, 500]);
});

test("does not treat a Cloudinary destroy error as success", async () => {
  let resourceCalls = 0;
  await assert.rejects(
    deleteAndVerifyCloudinaryVenueImage(publicId, "venue-1", {
      destroy: async () => { throw Object.assign(new Error("Unauthorized"), { http_code: 401 }); },
      resource: async () => { resourceCalls++; throw missingResourceError(); },
    }),
    /Cloudinary delete failed/,
  );
  assert.equal(resourceCalls, 0);
});

test("retains failure when the Admin API cannot verify deletion", async () => {
  await assert.rejects(
    deleteAndVerifyCloudinaryVenueImage(publicId, "venue-1", {
      destroy: async () => ({ result: "ok" }),
      resource: async () => { throw missingResourceError(503); },
    }),
    /could not be verified/,
  );
});

test("never sends an out-of-scope public ID to Cloudinary", async () => {
  let calls = 0;
  await assert.rejects(
    deleteAndVerifyCloudinaryVenueImage("other-project/asset", "venue-1", {
      destroy: async () => { calls++; return { result: "ok" }; },
      resource: async () => { calls++; throw missingResourceError(); },
    }),
    /Invalid SALIMO venue image identifier/,
  );
  assert.equal(calls, 0);
});
