import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Cliente de Prisma para acceso a base de datos
const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Datos enviados desde el frontend
    const body = await request.json();

    // Limpieza básica de espacios innecesarios
    const normalizedName = body.normalizedName.trim();
    const location = body.location.trim();
    const category = body.category;

    // Verifica si ya existe un local con el mismo nombre y ubicación
    // Ignora diferencias entre mayúsculas y minúsculas
    const existingVenue = await prisma.venue.findFirst({
      where: {
        normalizedName: {
          equals: normalizedName,
          mode: "insensitive",
        },

        location: {
          equals: location,
          mode: "insensitive",
        },
      },
    });

    // Evita registros duplicados
    if (existingVenue) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ya existe un local registrado con ese nombre y ubicación.",
        },
        {
          status: 400,
        }
      );
    }

    // Crea el nuevo local en la base de datos
    const newVenue = await prisma.venue.create({
      data: {
        // Se guarda el nombre original ingresado por el usuario
        originalName: normalizedName,

        normalizedName,
        location,
        category,

        // Datos automáticos del sistema
        source: "Manual",
        confidence: 100,
        isActive: true,
      },
    });

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      data: newVenue,
    });
  } catch (error) {
    console.error("Error al crear:", error);

    // Error interno del servidor
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
      },
      {
        status: 500,
      }
    );
  }
}