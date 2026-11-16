import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuthorization } from "./lib/security";

export function proxy(request: NextRequest) {
  // Solo las páginas y APIs administrativas requieren HTTP Basic.
  // /api/sync y /api/cron/sync conservan sus tokens Bearer independientes.
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Configuración de acceso administrativo incompleta." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!verifyAdminAuthorization(request.headers.get("authorization"))) {
    return new NextResponse("Acceso restringido. Se requieren credenciales.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="SALIMO. Admin", charset="UTF-8"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/venues/:path*"],
};
