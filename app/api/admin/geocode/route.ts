import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUnsafeCrossOrigin, verifyAdminAuthorization } from "@/lib/security";
import { buildNominatimUrl, normalizeAddressQuery, parseNominatimResults } from "@/lib/geocode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const responseHeaders = { "Cache-Control": "private, no-store" };

// Se usa únicamente bajo demanda del administrador. El bloqueo transaccional
// funciona entre instancias de Vercel y evita superar 1 solicitud/segundo.
export async function GET(request: Request) {
  if (!verifyAdminAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: responseHeaders });
  }
  if (isUnsafeCrossOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403, headers: responseHeaders });
  }
  const params = new URL(request.url).searchParams;
  const query = normalizeAddressQuery(params.get("q"));
  if (!query) {
    return NextResponse.json({ error: "Ingresá una dirección de al menos 3 caracteres (máximo 140)." }, { status: 400, headers: responseHeaders });
  }
  const city = params.get("city");
  if (city && !["San Miguel de Tucumán", "Yerba Buena"].includes(city)) {
    return NextResponse.json({ error: "Localidad inválida." }, { status: 400, headers: responseHeaders });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<Array<{ acquired: boolean }>>`
        SELECT pg_try_advisory_xact_lock(2026111701) AS acquired
      `;
      if (lock[0]?.acquired !== true) return { busy: true as const };
      const start = Date.now();
      try {
        const response = await fetch(buildNominatimUrl(query, city), {
          headers: {
            "User-Agent": "SALIMO-Admin-Geocoder/1.0 (https://salimo-tucuman.vercel.app/fuentes)",
            "Referer": "https://salimo-tucuman.vercel.app/admin/locales",
            "Accept": "application/json",
            "Accept-Language": "es",
          },
          next: { revalidate: 86400 },
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return { unavailable: true as const };
        const candidates = parseNominatimResults(await response.json());
        return { candidates };
      } finally {
        // Incluye el tiempo de red: la siguiente consulta empieza >1 s después.
        const remaining = 1250 - (Date.now() - start);
        if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
      }
    }, { maxWait: 1500, timeout: 12000 });

    if ("busy" in result) {
      return NextResponse.json({ error: "Hay otra búsqueda en curso. Intentá de nuevo en unos segundos." }, { status: 429, headers: { ...responseHeaders, "Retry-After": "2" } });
    }
    if ("unavailable" in result) {
      return NextResponse.json({ error: "El servicio de direcciones no está disponible. Podés ubicar el pin manualmente." }, { status: 503, headers: responseHeaders });
    }
    return NextResponse.json({ candidates: result.candidates, attribution: "© OpenStreetMap contributors" }, { headers: responseHeaders });
  } catch (error) {
    console.error("Error consultando geocodificación:", error);
    return NextResponse.json({ error: "No se pudo buscar la dirección. Ubicá el pin en el mapa o reintentá." }, { status: 503, headers: responseHeaders });
  }
}
