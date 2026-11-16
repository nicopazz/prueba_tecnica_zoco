import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { verifyAdminAuthorization } from "@/lib/security";

export const metadata: Metadata = { title: "Administración | SALIMO.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Protección adicional a proxy.ts: nunca consultar datos privados sin autenticación.
  const h = await headers();
  if (!verifyAdminAuthorization(h.get("authorization"))) notFound();
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4" aria-label="Administración">
          <Link href="/admin" className="text-lg font-bold">SALIMO. · Admin</Link>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/locales">Locales</Link>
            <Link href="/admin/revision">Revisión</Link>
            <Link href="/admin/sincronizaciones">Sincronizaciones</Link>
            <Link href="/admin/configuracion">Configuración</Link>
            <Link href="/">Web pública</Link>
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}
