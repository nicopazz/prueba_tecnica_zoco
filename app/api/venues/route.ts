import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuthorization, isUnsafeCrossOrigin } from "@/lib/security";
import { validateCreateVenue, isPrismaError } from "@/lib/venue-validation";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  if (!verifyAdminAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (isUnsafeCrossOrigin(request)) {
    return NextResponse.json({ success: false, error: "Origen no permitido" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "El cuerpo debe contener JSON válido." }, { status: 400 });
  }
  const result = validateCreateVenue(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }
  const { normalizedName, location, category } = result.data;

  try {
    const existingVenue = await prisma.venue.findFirst({
      where: {
        normalizedName: { equals: normalizedName, mode: "insensitive" },
        location: { equals: location, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existingVenue) {
      return NextResponse.json(
        { success: false, error: "Ya existe un local con ese nombre y ubicación." },
        { status: 409 }
      );
    }

    const newVenue = await prisma.venue.create({
      data: {
        originalName: normalizedName,
        normalizedName,
        location,
        category,
        source: "Manual",
        confidence: 100,
        isActive: true,
      },
    });
    return NextResponse.json({ success: true, data: newVenue }, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json({ success: false, error: "El local ya existe." }, { status: 409 });
    }
    console.error("Error interno al crear el local:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
