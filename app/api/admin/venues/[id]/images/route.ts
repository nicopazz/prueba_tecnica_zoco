import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuthorization, isUnsafeCrossOrigin, previewWritesBlocked } from "@/lib/security";
import { venueSchemaReady } from "@/lib/public-venues";
type Context = { params: Promise<{ id: string }> };
function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
}
export async function POST(request: Request, { params }: Context) {
  if (!verifyAdminAuthorization(request.headers.get("authorization"))) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  if (previewWritesBlocked() || isUnsafeCrossOrigin(request)) return NextResponse.json({ success: false, error: "Escritura no permitida" }, { status: 403 });
  if (!(await venueSchemaReady())) return NextResponse.json({ success: false, error: "Migración pendiente" }, { status: 503 });
  const { id } = await params;
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 }); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ success: false, error: "Datos inválidos" }, { status: 400 });
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((field) => !["imageUrl","sourceUrl","attribution","license","alt"].includes(field))) return NextResponse.json({ success: false, error: "Campos no permitidos" }, { status: 400 });
  const imageUrl = httpsUrl(body.imageUrl);
  const sourceUrl = httpsUrl(body.sourceUrl);
  const attribution = typeof body.attribution === "string" ? body.attribution.trim() : "";
  const license = typeof body.license === "string" ? body.license.trim() : "";
  const alt = typeof body.alt === "string" ? body.alt.trim() : "";
  if (!imageUrl || !sourceUrl || !attribution || attribution.length > 160 || !license || license.length > 100 || alt.length > 200) {
    return NextResponse.json({ success: false, error: "Se requiere URL HTTPS, origen, crédito y licencia válidos" }, { status: 400 });
  }
  const exists = await prisma.venue.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ success: false, error: "Local no encontrado" }, { status: 404 });
  const image = await prisma.venueImage.create({
    data: { venueId: id, imageUrl, sourceUrl, attribution, license, alt: alt || null },
    select: { id: true },
  });
  return NextResponse.json({ success: true, data: image }, { status: 201 });
}
