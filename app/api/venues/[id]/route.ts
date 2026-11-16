import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuthorization, isUnsafeCrossOrigin, previewWritesBlocked } from "@/lib/security";
import { validatePatchVenue, isPrismaError } from "@/lib/venue-validation";
import { venueSchemaReady } from "@/lib/public-venues";

type Context = { params: Promise<{ id: string }> };
function rejectUnauthorized(request: Request): Response | null {
  if (!verifyAdminAuthorization(request.headers.get("authorization"))) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  if (previewWritesBlocked()) return NextResponse.json({ success: false, error: "Escrituras deshabilitadas en Preview hasta aislar la base de datos." }, { status: 403 });
  if (isUnsafeCrossOrigin(request)) return NextResponse.json({ success: false, error: "Origen no permitido" }, { status: 403 });
  return null;
}
export async function PATCH(request: Request, { params }: Context) {
  const denied = rejectUnauthorized(request);
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 }); }
  const result = validatePatchVenue(body);
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  const { id } = await params;
  try {
    const current = await prisma.venue.findUnique({
      where: { id }, select: { id: true, normalizedName: true, location: true },
    });
    if (!current) return NextResponse.json({ success: false, error: "Local no encontrado." }, { status: 404 });
    if (result.data.normalizedName !== undefined || result.data.location !== undefined) {
      const name = result.data.normalizedName ?? current.normalizedName;
      const location = result.data.location ?? current.location;
      if (name) {
        const duplicate = await prisma.venue.findFirst({
          where: {
            id: { not: id }, normalizedName: { equals: name, mode: "insensitive" },
            location: { equals: location, mode: "insensitive" },
          }, select: { id: true },
        });
        if (duplicate) return NextResponse.json({ success: false, error: "Ya existe otro local con ese nombre y ubicación." }, { status: 409 });
      }
    }
    const updated = await prisma.venue.update({
      where: { id }, data: result.data,
      select: { id: true, normalizedName: true, location: true, category: true, isActive: true },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isPrismaError(error, "P2002")) return NextResponse.json({ success: false, error: "El local ya existe." }, { status: 409 });
    if (isPrismaError(error, "P2025")) return NextResponse.json({ success: false, error: "Local no encontrado." }, { status: 404 });
    console.error("Error actualizando establecimiento:", error);
    return NextResponse.json({ success: false, error: "No se pudo actualizar." }, { status: 500 });
  }
}
export async function DELETE(request: Request, { params }: Context) {
  const denied = rejectUnauthorized(request);
  if (denied) return denied;
  const { id } = await params;
  try {
    const found = await prisma.venue.findUnique({ where: { id }, select: { isActive: true } });
    if (!found || !found.isActive) return NextResponse.json({ success: false, error: "Local no encontrado o archivado." }, { status: 404 });
    const ready = await venueSchemaReady();
    // Archivado reversible: no se pierde el registro ni sus datos asociados.
    await prisma.venue.update({ where: { id },
      data: { isActive: false, ...(ready ? { publicationStatus: "HIDDEN", isFeatured: false } : {}) },
      select: { id: true },
    });
    return NextResponse.json({ success: true, message: "Local archivado (sin eliminación permanente)." });
  } catch (error) {
    if (isPrismaError(error, "P2025")) return NextResponse.json({ success: false, error: "Local no encontrado." }, { status: 404 });
    console.error("Error archivando establecimiento:", error);
    return NextResponse.json({ success: false, error: "No se pudo archivar." }, { status: 500 });
  }
}
