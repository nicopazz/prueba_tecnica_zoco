import { NextResponse } from "next/server";
import { verifySyncAuthorization } from "@/lib/security";
import { runSync, ConcurrentSyncError } from "@/services/sync";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  if (!verifySyncAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "No autorizado" }, {
      status: 401, headers: { "Cache-Control": "no-store" },
    });
  }
  try {
    const counts = await runSync();
    console.info("[SYNC]", JSON.stringify({ fecha: new Date().toISOString(), ...counts }));
    return NextResponse.json({
      success: true, message: "Sincronización completa.", counts,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const busy = error instanceof ConcurrentSyncError;
    console.error("Falló la sincronización:", error);
    return NextResponse.json({
      success: false,
      error: busy ? error.message : "No se pudo sincronizar; los cambios no fueron guardados.",
    }, { status: busy ? 409 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
