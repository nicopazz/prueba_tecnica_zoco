import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuthorization, isUnsafeCrossOrigin } from "@/lib/security";
import { validatePatchVenue, isPrismaError } from "@/lib/venue-validation";



type Context = { params: Promise<{ id: string }> };

function rejectUnauthorized(request: Request): Response | null {
  if (!verifyAdminAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (isUnsafeCrossOrigin(request)) {
    return NextResponse.json({ success: false, error: "Origen no permitido" }, { status: 403 });
  }
  return null;
}

export async function PATCH(request: Request, { params }: Context) {
  const denied = rejectUnauthorized(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "El cuerpo debe contener JSON válido." }, { status: 400 });
  }
  const result = validatePatchVenue(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  const { id } = await params;
  try {
    const current = await prisma.venue.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ success: false, error: "Local no encontrado." }, { status: 404 });
    }

    if (result.data.normalizedName !== undefined || result.data.location !== undefined) {
      const name = result.data.normalizedName ?? current.normalizedName;
      const location = result.data.location ?? current.location;
      if (name) {
        const duplicate = await prisma.venue.findFirst({
          where: {
            id: { not: id },
            normalizedName: { equals: name, mode: "insensitive" },
            location: { equals: location, mode: "insensitive" },
          },
          select: { id: true },
        });
        if (duplicate) {
          return NextResponse.json(
            { success: false, error: "Ya existe otro local con ese nombre y ubicación." },
            { status: 409 }
          );
        }
      }
    }
    const updated = await prisma.venue.update({ where: { id }, data: result.data });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json({ success: false, error: "El local ya existe." }, { status: 409 });
    }
    if (isPrismaError(error, "P2025")) {
      return NextResponse.json({ success: false, error: "Local no encontrado." }, { status: 404 });
    }
    console.error("Error interno al actualizar el local:", error);
    return NextResponse.json({ success: false, error: "No se pudo actualizar el local." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const denied = rejectUnauthorized(request);
  if (denied) return denied;

  const { id } = await params;
  try {
    await prisma.venue.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Local eliminado permanentemente." });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return NextResponse.json({ success: false, error: "Local no encontrado." }, { status: 404 });
    }
    console.error("Error interno al eliminar el local:", error);
    return NextResponse.json({ success: false, error: "No se pudo eliminar el local." }, { status: 500 });
  }
}
