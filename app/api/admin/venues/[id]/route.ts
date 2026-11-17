import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUnsafeCrossOrigin, previewWritesBlocked, verifyAdminAuthorization } from "@/lib/security";
import { venueSchemaReady } from "@/lib/public-venues";
import type { Prisma } from "@prisma/client";
import { isWithinSalimoArea } from "@/lib/venue-coordinates";

type Context = { params: Promise<{ id: string }> };
const categories = new Set(["Bar", "Pub", "Cervecería", "Boliche"]);
const cities = new Set(["San Miguel de Tucumán", "Yerba Buena"]);
const statusValues = new Set(["DRAFT", "PUBLISHED", "HIDDEN"]);
const reviewValues = new Set(["PENDING", "REVIEWED"]);
const editable = new Set([
  "normalizedName","location","category","city","address","latitude","longitude",
  "description","phone","whatsapp","instagram","website","openingHours",
  "isFeatured","publicationStatus","reviewStatus","isActive",
]);

function textField(value: unknown, label: string, max: number): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > max || /[\u0000-\u001F\u007F]/u.test(value)) throw new Error(`Valor inválido para ${label}`);
  return value.trim() || null;
}
function safeUrl(value: unknown, label: string): string | null {
  const url = textField(value, label, 400);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) throw new Error();
    if (label === "instagram" && !["instagram.com","www.instagram.com"].includes(parsed.hostname.toLowerCase())) throw new Error();
    return parsed.toString();
  } catch { throw new Error(`Ingresá una URL HTTPS válida para ${label}`); }
}
function slugify(value: string, id: string): string {
  const base = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 75);
  return (base || "lugar") + "-" + id;
}
export async function PATCH(request: Request, { params }: Context) {
  if (!verifyAdminAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (previewWritesBlocked() || isUnsafeCrossOrigin(request)) {
    return NextResponse.json({ success: false, error: "Escritura no permitida" }, { status: 403 });
  }
  if (!(await venueSchemaReady())) {
    return NextResponse.json({ success: false, error: "Primero se debe aplicar la migración de datos" }, { status: 503 });
  }
  const { id } = await params;
  let input: unknown;
  try { input = await request.json(); } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ success: false, error: "Datos inválidos" }, { status: 400 });
  }
  const fields = input as Record<string, unknown>;
  if (!Object.keys(fields).length || Object.keys(fields).some((key) => !editable.has(key))) {
    return NextResponse.json({ success: false, error: "Campos no permitidos" }, { status: 400 });
  }
  try {
    const current = await prisma.venue.findUnique({
      where: { id },
      select: { id: true, normalizedName: true, originalName: true, location: true, category: true,
        city: true, address: true, latitude: true, longitude: true, slug: true,
        publicationStatus: true, reviewStatus: true, isActive: true },
    });
    if (!current) return NextResponse.json({ success: false, error: "Local no encontrado" }, { status: 404 });

    const data: Prisma.VenueUncheckedUpdateInput = {};
    for (const [key, value] of Object.entries(fields)) {
      if (key === "normalizedName") {
        const name = textField(value, key, 160);
        if (!name || name.length < 2) throw new Error("Nombre obligatorio");
        data.normalizedName = name;
      } else if (key === "location") {
        const address = textField(value, key, 250);
        if (!address || address.length < 3) throw new Error("Ubicación obligatoria");
        data.location = address;
      } else if (key === "category") {
        if (typeof value !== "string" || !categories.has(value)) throw new Error("Categoría inválida");
        data.category = value;
      } else if (key === "city") {
        const city = textField(value, key, 90);
        if (city && !cities.has(city)) throw new Error("Localidad no permitida");
        data.city = city;
      } else if (key === "address") data.address = textField(value, key, 250);
      else if (key === "description") data.description = textField(value, key, 2000);
      else if (key === "phone") data.phone = textField(value, key, 32);
      else if (key === "whatsapp") {
        const phone = textField(value, key, 32);
        if (phone && !/^\+?[\d\s-]{7,32}$/.test(phone)) throw new Error("WhatsApp inválido");
        data.whatsapp = phone;
      } else if (key === "instagram" || key === "website") data[key] = safeUrl(value, key);
      else if (key === "openingHours") data.openingHours = textField(value, key, 500);
      else if (key === "latitude" || key === "longitude") {
        const number = value === null || value === "" ? null : value;
        const max = key === "latitude" ? 90 : 180;
        if (number !== null && (typeof number !== "number" || !Number.isFinite(number) || Math.abs(number) > max)) throw new Error(`Coordenada inválida: ${key}`);
        data[key] = number;
      } else if (key === "reviewStatus") {
        if (typeof value !== "string" || !reviewValues.has(value)) throw new Error("Estado de revisión inválido");
        data.reviewStatus = value;
        data.lastReviewedAt = value === "REVIEWED" ? new Date() : null;
      } else if (key === "publicationStatus") {
        if (typeof value !== "string" || !statusValues.has(value)) throw new Error("Estado de publicación inválido");
        data.publicationStatus = value;
      } else if (key === "isFeatured" || key === "isActive") {
        if (typeof value !== "boolean") throw new Error(`Valor inválido: ${key}`);
        data[key] = value;
      }
    }

    const nextName = typeof data.normalizedName === "string" ? data.normalizedName : (current.normalizedName || current.originalName);
    const nextStatus = typeof data.publicationStatus === "string" ? data.publicationStatus : current.publicationStatus;
    const nextReview = typeof data.reviewStatus === "string" ? data.reviewStatus : current.reviewStatus;
    const nextCity = data.city !== undefined ? data.city : current.city;
    const nextCategory = data.category !== undefined ? data.category : current.category;
    const nextLocation = data.location !== undefined ? data.location : current.location;
    const nextAddress = data.address !== undefined ? data.address : current.address;
    const nextLatitude = data.latitude !== undefined ? data.latitude : current.latitude;
    const nextLongitude = data.longitude !== undefined ? data.longitude : current.longitude;
    if ((nextLatitude === null) !== (nextLongitude === null)) throw new Error("Ingresá ambas coordenadas o dejá ambas vacías");
    if (nextLatitude !== null && nextLongitude !== null && (fields.latitude !== undefined || fields.longitude !== undefined) && !isWithinSalimoArea(nextLatitude as number, nextLongitude as number)) {
      throw new Error("Las coordenadas deben corresponder al área de San Miguel de Tucumán o Yerba Buena");
    }
    if (nextStatus === "PUBLISHED" && (nextReview !== "REVIEWED" || !nextCity || !nextCategory || (!nextAddress && !nextLocation))) {
      throw new Error("Para publicar necesitás revisión, categoría, localidad y ubicación");
    }
    if (nextStatus === "PUBLISHED" && !current.slug) data.slug = slugify(nextName, id);
    if (nextStatus !== "PUBLISHED") data.isFeatured = false;
    const updated = await prisma.venue.update({
      where: { id }, data,
      select: { id: true, slug: true, publicationStatus: true, reviewStatus: true },
    });
    return NextResponse.json({ success: true, data: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && !("code" in error)) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    console.error("No se pudo guardar el local:", error);
    return NextResponse.json({ success: false, error: "No se pudo guardar el local" }, { status: 500 });
  }
}
