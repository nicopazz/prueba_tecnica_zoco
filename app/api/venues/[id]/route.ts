import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Cliente de Prisma para operaciones con la base de datos
const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Datos enviados desde el frontend
    const body = await request.json();

    // Campos editables recibidos opcionalmente
    const { isActive, normalizedName, location, category } = body;

    // Obtiene el id dinámico desde la URL
    const resolvedParams = await params;
    const venueId = resolvedParams.id;

    // Actualiza únicamente los campos presentes en el body
    const updatedVenue = await prisma.venue.update({
      where: {
        id: venueId,
      },

      data: {
        ...(isActive !== undefined && { isActive }),

        ...(normalizedName !== undefined && {
          normalizedName,
          
        }),

        ...(location !== undefined && {
          location,
        }),
        ...(category !== undefined && { 
          category }),
      },
    });

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      data: updatedVenue,
    });
  } catch (error) {
    console.error("Error al actualizar:", error);

    // Error interno del servidor
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo actualizar",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Obtiene el id dinámico desde la URL
    const resolvedParams = await params;
    const venueId = resolvedParams.id;

    // Eliminación permanente del registro
    await prisma.venue.delete({
      where: {
        id: venueId,
      },
    });

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: "Local eliminado permanentemente",
    });
  } catch (error) {
    console.error("Error al eliminar:", error);

    // Error interno del servidor
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo eliminar el local",
      },
      {
        status: 500,
      }
    );
  }
}