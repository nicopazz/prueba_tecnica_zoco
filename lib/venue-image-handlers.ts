import {
  isUnsafeCrossOrigin,
  previewWritesBlocked,
  verifyAdminAuthorization,
} from "./security.ts";
import {
  ACCEPTED_VENUE_IMAGE_TYPES,
  isSalimoVenueImagePublicId,
  isValidVenueImageVenueId,
  MAX_VENUE_IMAGE_BYTES,
  MAX_VENUE_IMAGES,
} from "./venue-image-constants.ts";

const MAX_MULTIPART_BYTES = MAX_VENUE_IMAGE_BYTES + 32 * 1024;
const IMAGE_TYPES = new Set<string>(ACCEPTED_VENUE_IMAGE_TYPES);
export type VenueImageData = {
  venueId: string;
  imageUrl: string;
  publicId: string | null;
  sourceUrl: string;
  attribution: string;
  license: string;
  alt: string | null;
};

export class VenueNotFoundError extends Error {}
export class VenueImageLimitError extends Error {}

type StoredImage = { id: string };
type UploadedAsset = { secureUrl: string; publicId: string };
type ImageHandlersDependencies = {
  schemaReady(): Promise<boolean>;
  storageConfigured(): boolean;
  venueExists(venueId: string): Promise<boolean>;
  imageCount(venueId: string): Promise<number>;
  createImage(data: VenueImageData): Promise<StoredImage>;
  findImage(venueId: string, imageId: string): Promise<{ publicId: string | null } | null>;
  deleteImage(venueId: string, imageId: string): Promise<boolean>;
  uploadImage(input: {
    venueId: string;
    bytes: Uint8Array;
    mimeType: string;
  }): Promise<UploadedAsset>;
  destroyImage(publicId: string, venueId: string): Promise<void>;
};

type ImageMetadata = {
  sourceUrl: string;
  attribution: string;
  license: string;
  alt: string | null;
};

function response(error: string, status: number) {
  return Response.json(
    { success: false, error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function validVenueId(id: string): boolean {
  return isValidVenueImageVenueId(id);
}

function httpsUrl(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

function metadataFrom(
  values: Record<string, unknown>,
  authorizationConfirmed: boolean,
): ImageMetadata | null {
  const sourceUrl = httpsUrl(values.sourceUrl, 500);
  const attribution = cleanText(values.attribution, 160);
  const license = cleanText(values.license, 100);
  const altValue = values.alt === undefined || values.alt === null ? "" : values.alt;
  const alt = typeof altValue === "string" ? altValue.trim() : null;
  if (
    !authorizationConfirmed ||
    !sourceUrl ||
    !attribution ||
    !license ||
    alt === null ||
    alt.length > 200 ||
    /[\u0000-\u001f\u007f]/u.test(alt)
  ) return null;
  return { sourceUrl, attribution, license, alt: alt || null };
}

function detectedImageType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return null;
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function parseContentLength(request: Request): boolean {
  const value = request.headers.get("content-length");
  if (!value) return true;
  if (!/^\d+$/u.test(value)) return false;
  return Number(value) <= MAX_MULTIPART_BYTES;
}

function validCloudinaryUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function createVenueImageHandlers(dependencies: ImageHandlersDependencies) {
  async function POST(request: Request, venueId: string): Promise<Response> {
    if (!verifyAdminAuthorization(request.headers.get("authorization"))) {
      return response("No autorizado", 401);
    }
    if (previewWritesBlocked() || isUnsafeCrossOrigin(request)) {
      return response("Escritura no permitida", 403);
    }
    if (!validVenueId(venueId)) return response("Identificador de local inválido", 400);
    if (!(await dependencies.schemaReady())) return response("Migración pendiente", 503);

    const contentType = request.headers.get("content-type")?.toLowerCase() || "";
    if (contentType.startsWith("multipart/form-data")) {
      if (!dependencies.storageConfigured()) {
        return response("La subida de fotografías no está configurada.", 503);
      }
      if (!parseContentLength(request)) return response("El archivo supera el límite permitido.", 413);
      let exists: boolean;
      try {
        exists = await dependencies.venueExists(venueId);
      } catch {
        return response("No se pudo verificar el establecimiento.", 503);
      }
      if (!exists) return response("Local no encontrado", 404);

      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return response("Formulario de fotografía inválido", 400);
      }
      const allowedFields = new Set([
        "file",
        "sourceUrl",
        "attribution",
        "license",
        "alt",
        "authorizationConfirmed",
      ]);
      if ([...form.keys()].some((key) => !allowedFields.has(key)) || form.getAll("file").length !== 1) {
        return response("Formulario de fotografía inválido", 400);
      }
      if (["sourceUrl", "attribution", "license", "alt", "authorizationConfirmed"]
        .some((key) => form.getAll(key).length > 1)) {
        return response("Formulario de fotografía inválido", 400);
      }
      const file = form.get("file");
      if (!isFile(file)) return response("Seleccioná una fotografía válida.", 400);
      if (!IMAGE_TYPES.has(file.type)) return response("Formato no permitido. Usá JPEG, PNG o WebP.", 400);
      if (file.size === 0) return response("El archivo está vacío.", 400);
      if (file.size > MAX_VENUE_IMAGE_BYTES) {
        return response("Cada fotografía debe pesar hasta 4 MB.", 413);
      }

      const metadata = metadataFrom(
        Object.fromEntries(form.entries()),
        form.get("authorizationConfirmed") === "true",
      );
      if (!metadata) {
        return response("Confirmá la autorización e indicá origen, crédito y licencia válidos.", 400);
      }
      let count: number;
      try {
        count = await dependencies.imageCount(venueId);
      } catch {
        return response("No se pudo verificar el límite de fotografías.", 503);
      }
      if (count >= MAX_VENUE_IMAGES) {
        return response("El local ya alcanzó el máximo de cinco fotografías.", 409);
      }

      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(await file.arrayBuffer());
      } catch {
        return response("No se pudo leer el archivo seleccionado.", 400);
      }
      const detectedType = detectedImageType(bytes);
      if (bytes.byteLength !== file.size || detectedType !== file.type) {
        return response("El contenido no coincide con un JPEG, PNG o WebP válido.", 400);
      }

      let uploaded: UploadedAsset;
      try {
        uploaded = await dependencies.uploadImage({ venueId, bytes, mimeType: detectedType });
      } catch {
        return response("No se pudo subir la fotografía. Volvé a intentar.", 502);
      }
      const validPublicId = isSalimoVenueImagePublicId(uploaded.publicId, venueId);
      if (!validPublicId || !validCloudinaryUrl(uploaded.secureUrl)) {
        try {
          if (validPublicId) await dependencies.destroyImage(uploaded.publicId, venueId);
        } catch {
          console.error("No se pudo limpiar una carga temporal de fotografías.");
        }
        return response("No se pudo validar la fotografía subida.", 502);
      }

      try {
        const image = await dependencies.createImage({
          venueId,
          ...metadata,
          imageUrl: uploaded.secureUrl,
          publicId: uploaded.publicId,
        });
        return Response.json(
          { success: true, data: image },
          { status: 201, headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        try {
          await dependencies.destroyImage(uploaded.publicId, venueId);
        } catch {
          console.error("No se pudo limpiar una carga de fotografías tras un error de guardado.");
        }
        if (error instanceof VenueImageLimitError) {
          return response("El local ya alcanzó el máximo de cinco fotografías.", 409);
        }
        if (error instanceof VenueNotFoundError) return response("Local no encontrado", 404);
        console.error("No se pudo guardar la fotografía del local.");
        return response("No se pudo guardar la fotografía. Volvé a intentar.", 500);
      }
    }

    if (!contentType.startsWith("application/json")) {
      return response("Tipo de contenido no permitido", 415);
    }
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return response("JSON inválido", 400);
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return response("Datos inválidos", 400);
    }
    const body = input as Record<string, unknown>;
    const allowedFields = new Set([
      "imageUrl",
      "sourceUrl",
      "attribution",
      "license",
      "alt",
      "authorizationConfirmed",
    ]);
    if (Object.keys(body).some((field) => !allowedFields.has(field))) {
      return response("Campos no permitidos", 400);
    }
    const imageUrl = httpsUrl(body.imageUrl, 500);
    const metadata = metadataFrom(body, body.authorizationConfirmed === true);
    if (!imageUrl || !metadata) {
      return response("Se requiere URL HTTPS, autorización, origen, crédito y licencia válidos.", 400);
    }
    let exists: boolean;
    let count: number;
    try {
      exists = await dependencies.venueExists(venueId);
      if (!exists) return response("Local no encontrado", 404);
      count = await dependencies.imageCount(venueId);
    } catch {
      return response("No se pudo verificar el establecimiento.", 503);
    }
    if (count >= MAX_VENUE_IMAGES) {
      return response("El local ya alcanzó el máximo de cinco fotografías.", 409);
    }
    try {
      const image = await dependencies.createImage({
        venueId,
        ...metadata,
        imageUrl,
        publicId: null,
      });
      return Response.json(
        { success: true, data: image },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      if (error instanceof VenueImageLimitError) {
        return response("El local ya alcanzó el máximo de cinco fotografías.", 409);
      }
      if (error instanceof VenueNotFoundError) return response("Local no encontrado", 404);
      console.error("No se pudo registrar la fotografía del local.");
      return response("No se pudo agregar la fotografía.", 500);
    }
  }

  async function DELETE(
    request: Request,
    venueId: string,
    imageId: string,
  ): Promise<Response> {
    if (!verifyAdminAuthorization(request.headers.get("authorization"))) {
      return response("No autorizado", 401);
    }
    if (previewWritesBlocked() || isUnsafeCrossOrigin(request)) {
      return response("Escritura no permitida", 403);
    }
    if (!validVenueId(venueId) || !validVenueId(imageId)) {
      return response("Identificador inválido", 400);
    }
    if (!(await dependencies.schemaReady())) return response("Migración pendiente", 503);
    let image: { publicId: string | null } | null;
    try {
      image = await dependencies.findImage(venueId, imageId);
    } catch {
      return response("No se pudo verificar la fotografía.", 503);
    }
    if (!image) return response("Imagen no encontrada", 404);

    if (image.publicId) {
      if (!isSalimoVenueImagePublicId(image.publicId, venueId)) {
        return response("La fotografía no pertenece a este local.", 409);
      }
      if (!dependencies.storageConfigured()) {
        return response("La eliminación de fotografías no está configurada.", 503);
      }
      try {
        await dependencies.destroyImage(image.publicId, venueId);
      } catch {
        return response("No se pudo eliminar la fotografía. Volvé a intentar.", 502);
      }
    }

    try {
      if (!(await dependencies.deleteImage(venueId, imageId))) {
        return response("Imagen no encontrada", 404);
      }
      return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      console.error("No se pudo quitar la fotografía del local.");
      return response("No se pudo quitar la fotografía.", 500);
    }
  }

  return { POST, DELETE };
}
