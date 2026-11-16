import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuthorization, isUnsafeCrossOrigin, previewWritesBlocked } from "@/lib/security";
import { validateCreateVenue, isPrismaError } from "@/lib/venue-validation";

export async function POST(request: Request) {
  if (!verifyAdminAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (previewWritesBlocked()) {
    return NextResponse.json({ success: false, error: "Escrituras deshabilitadas en Preview hasta aislar la base de datos." }, { status: 403 });
  }
  if (isUnsafeCrossOrigin(request)) {
    return NextResponse.json({ success: false, error: "Origen no permitido" }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "JSON inválido." }, { status: 400 }); }
  const result = validateCreateVenue(body);
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  const { normalizedName, location, category } = result.data;
  try {
    const duplicate = await prisma.venue.findFirst({
      where: {
        normalizedName: { equals: normalizedName, mode: "insensitive" },
        location: { equals: location, mode: "insensitive" },
      }, select: { id: true },
    });
    if (duplicate) return NextResponse.json({ success: false, error: "Ya existe un local con ese nombre y ubicación." }, { status: 409 });
    // Selección restringida para compatibilidad con la base de Neon previa a la migración.
    const venue = await prisma.venue.create({
      data: {
        originalName: normalizedName, normalizedName, location,
        category, source: "Manual", confidence: 100, isActive: true,
      },
      select: { id: true, normalizedName: true, location: true, category: true, isActive: true },
    });
    return NextResponse.json({ success: true, data: venue }, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) return NextResponse.json({ success: false, error: "El local ya existe." }, { status: 409 });
    console.error("Error creando establecimiento:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
