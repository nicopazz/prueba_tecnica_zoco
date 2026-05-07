import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { normalizedName, location, category } = body;

    // Creamos el registro en la base de datos
    const newVenue = await prisma.venue.create({
      data: {
        originalName: normalizedName, // Como es manual, original y normalizado son iguales
        normalizedName,
        location,
        category,
        source: "Manual",
        confidence: 100, // Lo cargó un humano, 100% de confianza
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: newVenue });
  } catch (error) {
    console.error("Error al crear:", error);
    return NextResponse.json({ success: false, error: "No se pudo crear el local" }, { status: 500 });
  }
}