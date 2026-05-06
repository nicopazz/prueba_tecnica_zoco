import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    
    // 1. Extraemos TODOS los posibles campos que vienen del frontend
    const { isActive, normalizedName, location } = body;

    const resolvedParams = await params;
    const venueId = resolvedParams.id;

    // 2. Actualizamos en la base de datos permitiendo cambios opcionales
    const updatedVenue = await prisma.venue.update({
      where: { id: venueId },
      data: { 
        // Solo actualiza si el campo viene en el body, sino mantiene el anterior
        ...(isActive !== undefined && { isActive }),
        ...(normalizedName !== undefined && { normalizedName }),
        ...(location !== undefined && { location }),
      },
    });

    return NextResponse.json({ success: true, data: updatedVenue });
  } catch (error) {
    console.error("Error al actualizar:", error);
    return NextResponse.json({ success: false, error: "No se pudo actualizar" }, { status: 500 });
  }
}