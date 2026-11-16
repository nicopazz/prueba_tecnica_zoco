import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuthorization } from "./lib/security";

export function proxy(request: NextRequest) {
  // El worker tiene una credencial de servicio distinta; la ruta valida su Bearer.
  if (request.nextUrl.pathname === "/api/sync") return NextResponse.next();

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
        "WWW-Authenticate": 'Basic realm="Zoco Admin", charset="UTF-8"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
