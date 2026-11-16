import { NextResponse } from "next/server";
import { verifyCronAuthorization } from "@/lib/security";
import { runSync, ConcurrentSyncError } from "@/services/sync";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function GET(request: Request) {
  if (!verifyCronAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "No autorizado" }, {
      status: 401, headers: { "Cache-Control": "no-store" },
    });
  }
  try {
    const counts = await runSync("CRON");
    console.info("[CRON SYNC]", JSON.stringify({ fecha: new Date().toISOString(), ...counts }));
    return NextResponse.json({ success: true, counts }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const busy = error instanceof ConcurrentSyncError;
    console.error("Error ejecutando el cron:", error);
    return NextResponse.json({
      success: false,
      error: busy ? error.message : "No se pudo completar la sincronización programada.",
    }, { status: busy ? 409 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
