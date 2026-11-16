import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuthorization, isUnsafeCrossOrigin, previewWritesBlocked } from "@/lib/security";
import { venueSchemaReady } from "@/lib/public-venues";
type Context = { params: Promise<{ id: string; imageId: string }> };
export async function DELETE(request: Request, { params }: Context) {
  if (!verifyAdminAuthorization(request.headers.get("authorization"))) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  if (previewWritesBlocked() || isUnsafeCrossOrigin(request)) return NextResponse.json({ success: false, error: "Escritura no permitida" }, { status: 403 });
  if (!(await venueSchemaReady())) return NextResponse.json({ success: false, error: "Migración pendiente" }, { status: 503 });
  const { id, imageId } = await params;
  const result = await prisma.venueImage.deleteMany({ where: { id: imageId, venueId: id } });
  return result.count === 1
    ? NextResponse.json({ success: true })
    : NextResponse.json({ success: false, error: "Imagen no encontrada" }, { status: 404 });
}
