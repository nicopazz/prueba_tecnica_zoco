import { NextResponse } from "next/server";
import { verifyAdminAuthorization, isUnsafeCrossOrigin, previewWritesBlocked } from "@/lib/security";
import { ConcurrentSyncError, runSync } from "@/services/sync";

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
    return NextResponse.json({
      success: false,
      error: busy ? error.message : "No se pudo sincronizar. Verificá los registros del servidor.",
    }, { status: busy ? 409 : 503 });
  }
}
