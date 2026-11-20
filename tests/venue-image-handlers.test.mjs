import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  createVenueImageHandlers,
} from "../lib/venue-image-handlers.ts";
import { MAX_VENUE_IMAGE_BYTES } from "../lib/venue-image-constants.ts";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jLz8AAAAASUVORK5CYII=",
  "base64",
);
const authorization = `Basic ${Buffer.from("admin:test-password").toString("base64")}`;

beforeEach(() => {
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "test-password";
  delete process.env.VERCEL_ENV;
});

function createTestHandlers(options = {}) {
  const state = {
    images: [],
    uploaded: [],
    destroyed: [],
    deleted: [],
  };
  const handlers = createVenueImageHandlers({
    schemaReady: async () => options.schemaReady ?? true,
    storageConfigured: () => options.storageConfigured ?? true,
    venueExists: async (id) => options.venueExists ?? id === "venue-1",
    imageCount: async (id) => state.images.filter((image) => image.venueId === id).length,
    createImage: async (data) => {
      if (options.saveError) throw new Error("database failure");
      if (!options.venueExists && data.venueId !== "venue-1") throw new Error("venue missing");
      if (state.images.filter((image) => image.venueId === data.venueId).length >= 5) {
        throw new Error("image limit");
      }
      const image = { ...data, id: `image-${state.images.length + 1}` };
      state.images.push(image);
      return { id: image.id };
    },
    findImage: async (venueId, imageId) => {
      const image = state.images.find((item) => item.venueId === venueId && item.id === imageId);
      return image ? { publicId: image.publicId } : null;
    },
    deleteImage: async (venueId, imageId) => {
      const index = state.images.findIndex((item) => item.venueId === venueId && item.id === imageId);
      if (index < 0) return false;
      state.deleted.push({ venueId, imageId });
      state.images.splice(index, 1);
      return true;
    },
    uploadImage: async (input) => {
      state.uploaded.push(input);
      if (options.uploadError) throw new Error("Cloudinary failure");
      return {
        secureUrl: "https://res.cloudinary.com/test-cloud/image/upload/v1/test.png",
        publicId: options.uploadPublicId ||
          `salimo/venues/${input.venueId}/123e4567-e89b-42d3-a456-426614174000`,
      };
    },
    destroyImage: async (publicId) => {
      state.destroyed.push(publicId);
      if (options.destroyError) throw new Error("Cloudinary delete failure");
    },
  });
  return { handlers, state };
}

function uploadRequest(file, { authorized = "true", headers = {} } = {}) {
  const form = new FormData();
  form.set("file", file);
  form.set("sourceUrl", "https://source.example/photo");
  form.set("attribution", "Foto de prueba");
  form.set("license", "Autorización escrita");
  form.set("alt", "Exterior del establecimiento");
  form.set("authorizationConfirmed", authorized);
  return new Request("https://salimo.example/api/admin/venues/venue-1/images", {
    method: "POST",
    headers: { authorization, ...headers },
    body: form,
  });
}

function deleteRequest(body) {
  return new Request("https://salimo.example/api/admin/venues/venue-1/images/image-1", {
    method: "DELETE",
    headers: {
      authorization,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body,
  });
}

test("sube una imagen válida y la asocia al establecimiento solicitado", async () => {
  const { handlers, state } = createTestHandlers();
  const file = new File([png], "front.png", { type: "image/png" });
  const response = await handlers.POST(uploadRequest(file), "venue-1");

  assert.equal(response.status, 201);
  assert.equal(state.uploaded.length, 1);
  assert.equal(state.uploaded[0].mimeType, "image/png");
  assert.equal(state.images[0].venueId, "venue-1");
  assert.equal(
    state.images[0].publicId,
    "salimo/venues/venue-1/123e4567-e89b-42d3-a456-426614174000",
  );
  assert.equal(state.images[0].sourceUrl, "https://source.example/photo");
});

test("rechaza archivos mayores a 4 MB antes de enviarlos a Cloudinary", async () => {
  const { handlers, state } = createTestHandlers();
  const file = new File([new Uint8Array(MAX_VENUE_IMAGE_BYTES + 1)], "large.png", { type: "image/png" });
  const response = await handlers.POST(uploadRequest(file), "venue-1");

  assert.equal(response.status, 413);
  assert.equal(state.uploaded.length, 0);
});

test("rechaza la subida cuando Cloudinary no está configurado", async () => {
  const { handlers, state } = createTestHandlers({ storageConfigured: false });
  const response = await handlers.POST(
    uploadRequest(new File([png], "photo.png", { type: "image/png" })),
    "venue-1",
  );

  assert.equal(response.status, 503);
  assert.equal(state.uploaded.length, 0);
});

test("rechaza MIME y contenido que no coinciden con formatos permitidos", async () => {
  const { handlers, state } = createTestHandlers();
  const wrongMime = new File([png], "photo.svg", { type: "image/svg+xml" });
  const wrongContent = new File(["not an image"], "photo.png", { type: "image/png" });

  assert.equal((await handlers.POST(uploadRequest(wrongMime), "venue-1")).status, 400);
  assert.equal((await handlers.POST(uploadRequest(wrongContent), "venue-1")).status, 400);
  assert.equal(state.uploaded.length, 0);
});

test("rechaza solicitudes anónimas y no consulta ni sube archivos", async () => {
  const { handlers, state } = createTestHandlers();
  const request = uploadRequest(new File([png], "photo.png", { type: "image/png" }), {
    headers: { authorization: "" },
  });
  const response = await handlers.POST(request, "venue-1");

  assert.equal(response.status, 401);
  assert.equal(state.uploaded.length, 0);
});

test("rechaza establecimientos inexistentes", async () => {
  const { handlers, state } = createTestHandlers({ venueExists: false });
  const response = await handlers.POST(
    uploadRequest(new File([png], "photo.png", { type: "image/png" })),
    "missing-venue",
  );

  assert.equal(response.status, 404);
  assert.equal(state.uploaded.length, 0);
});

test("no acepta public IDs aportados por el navegador", async () => {
  const { handlers, state } = createTestHandlers();
  const response = await handlers.POST(new Request(
    "https://salimo.example/api/admin/venues/venue-1/images",
    {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://images.example/photo.jpg",
        publicId: "other-project/private/image",
        sourceUrl: "https://source.example/photo",
        attribution: "Foto externa",
        license: "Autorización escrita",
        alt: "Fachada",
        authorizationConfirmed: true,
      }),
    },
  ), "venue-1");

  assert.equal(response.status, 400);
  assert.equal(state.images.length, 0);
  assert.equal(state.destroyed.length, 0);
});

test("no registra ni elimina public IDs inesperados devueltos por el proveedor", async () => {
  const { handlers, state } = createTestHandlers({
    uploadPublicId: "other-project/venue-1/image",
  });
  const response = await handlers.POST(
    uploadRequest(new File([png], "photo.png", { type: "image/png" })),
    "venue-1",
  );

  assert.equal(response.status, 502);
  assert.equal(state.images.length, 0);
  assert.equal(state.destroyed.length, 0);
});

test("informa errores de Cloudinary sin revelar detalles del proveedor", async () => {
  const { handlers } = createTestHandlers({ uploadError: true });
  const response = await handlers.POST(
    uploadRequest(new File([png], "photo.png", { type: "image/png" })),
    "venue-1",
  );

  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /Cloudinary failure/);
});

test("limpia el recurso de Cloudinary si falla el guardado en la base", async () => {
  const { handlers, state } = createTestHandlers({ saveError: true });
  const response = await handlers.POST(
    uploadRequest(new File([png], "photo.png", { type: "image/png" })),
    "venue-1",
  );

  assert.equal(response.status, 500);
  assert.deepEqual(
    state.destroyed,
    ["salimo/venues/venue-1/123e4567-e89b-42d3-a456-426614174000"],
  );
  assert.equal(state.images.length, 0);
});

test("rechaza la confirmación de autorización ausente", async () => {
  const { handlers, state } = createTestHandlers();
  const response = await handlers.POST(
    uploadRequest(new File([png], "photo.png", { type: "image/png" }), { authorized: "false" }),
    "venue-1",
  );

  assert.equal(response.status, 400);
  assert.equal(state.uploaded.length, 0);
});

test("conserva el registro por URL HTTPS sin crear recursos Cloudinary", async () => {
  const { handlers, state } = createTestHandlers();
  const response = await handlers.POST(new Request(
    "https://salimo.example/api/admin/venues/venue-1/images",
    {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://images.example/photo.jpg",
        sourceUrl: "https://source.example/photo",
        attribution: "Foto externa",
        license: "Autorización escrita",
        alt: "Fachada",
        authorizationConfirmed: true,
      }),
    },
  ), "venue-1");

  assert.equal(response.status, 201);
  assert.equal(state.images[0].publicId, null);
  assert.equal(state.images[0].imageUrl, "https://images.example/photo.jpg");
  assert.equal(state.uploaded.length, 0);
});

test("el borrado elimina solo el recurso Cloudinary del establecimiento asociado", async () => {
  const { handlers, state } = createTestHandlers();
  state.images.push({
    id: "image-1",
    venueId: "venue-1",
    publicId: "salimo/venues/venue-1/123e4567-e89b-42d3-a456-426614174000",
  });
  const response = await handlers.DELETE(
    deleteRequest(JSON.stringify({ publicId: "other-project/asset" })),
    "venue-1",
    "image-1",
  );

  assert.equal(response.status, 200);
  assert.deepEqual(
    state.destroyed,
    ["salimo/venues/venue-1/123e4567-e89b-42d3-a456-426614174000"],
  );
  assert.deepEqual(state.deleted, [{ venueId: "venue-1", imageId: "image-1" }]);
});

test("no llama a Cloudinary al quitar una URL externa", async () => {
  const { handlers, state } = createTestHandlers();
  state.images.push({ id: "image-1", venueId: "venue-1", publicId: null });
  const response = await handlers.DELETE(deleteRequest(), "venue-1", "image-1");

  assert.equal(response.status, 200);
  assert.equal(state.destroyed.length, 0);
  assert.equal(state.images.length, 0);
});

test("no borra VenueImage si Cloudinary no confirma la eliminación", async () => {
  const { handlers, state } = createTestHandlers({ destroyError: true });
  state.images.push({
    id: "image-1",
    venueId: "venue-1",
    publicId: "salimo/venues/venue-1/123e4567-e89b-42d3-a456-426614174000",
  });
  const response = await handlers.DELETE(deleteRequest(), "venue-1", "image-1");

  assert.equal(response.status, 502);
  assert.equal(state.deleted.length, 0);
  assert.equal(state.images.length, 1);
});

test("no puede borrar una fotografía asociada a otro establecimiento", async () => {
  const { handlers, state } = createTestHandlers();
  state.images.push({
    id: "image-1",
    venueId: "venue-2",
    publicId: "salimo/venues/venue-2/photo",
  });
  const response = await handlers.DELETE(deleteRequest(), "venue-1", "image-1");

  assert.equal(response.status, 404);
  assert.equal(state.destroyed.length, 0);
  assert.equal(state.deleted.length, 0);
});

test("no elimina un publicId cuyo directorio no corresponde al establecimiento", async () => {
  const { handlers, state } = createTestHandlers();
  state.images.push({
    id: "image-1",
    venueId: "venue-1",
    publicId: "salimo/venues/venue-10/123e4567-e89b-42d3-a456-426614174000",
  });
  const response = await handlers.DELETE(deleteRequest(), "venue-1", "image-1");

  assert.equal(response.status, 409);
  assert.equal(state.destroyed.length, 0);
  assert.equal(state.deleted.length, 0);
});

test("no elimina public IDs ajenos aunque aparezcan en un registro", async () => {
  const { handlers, state } = createTestHandlers();
  state.images.push({
    id: "image-1",
    venueId: "venue-1",
    publicId: "other-project/venue-1/photo",
  });
  const response = await handlers.DELETE(deleteRequest(), "venue-1", "image-1");

  assert.equal(response.status, 409);
  assert.equal(state.destroyed.length, 0);
  assert.equal(state.deleted.length, 0);
});
