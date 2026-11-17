import { NextResponse } from "next/server";
import { verifyAdminAuthorization, isUnsafeCrossOrigin, previewWritesBlocked } from "@/lib/security";
import { ConcurrentSyncError, runSync } from "@/services/sync";
import { OverpassServiceError } from "@/services/overpass";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  if (!verifyAdminAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }
  if (previewWritesBlocked()) {
    return NextResponse.json({
      success: false, error: "Sincronización deshabilitada: Preview comparte una base sin aislar.",
    }, { status: 403 });
  }
  if (isUnsafeCrossOrigin(request)) {
    return NextResponse.json({ success: false, error: "Origen no permitido" }, { status: 403 });
  }
  try {
    const counts = await runSync("MANUAL");
    return NextResponse.json({ success: true, counts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error en sincronización manual:", error);
    const busy = error instanceof ConcurrentSyncError;
    const overpass = error instanceof OverpassServiceError ? error : null;
    const status = busy ? 409 : overpass?.reason === "RATE_LIMITED" ? 429 : 503;
    return NextResponse.json({
      success: false,
      error: busy ? error.message : overpass?.message || "No se pudo sincronizar. Revisá los registros del servidor.",
    }, {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(overpass ? { "Retry-After": String(overpass.retryAfterSeconds) } : {}),
      },
    });
  }
}
