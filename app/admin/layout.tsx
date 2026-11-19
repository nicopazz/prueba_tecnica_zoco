import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { verifyAdminAuthorization } from "@/lib/security";
import { adminEnvironment, adminVisualPreview } from "@/lib/admin-visual-preview";
import AdminNavigation from "@/app/components/AdminNavigation";
import ListFeedback from "./locales/list-feedback";
import "./admin.css";

export const metadata: Metadata = { title: "Administración | SALIMO.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  if (!verifyAdminAuthorization(h.get("authorization"))) notFound();
  const visualPreview = adminVisualPreview();
  return <div className="admin-workspace"><AdminNavigation environment={adminEnvironment()}/><div id="contenido-admin" tabIndex={-1} className="admin-content">
    {visualPreview ? <div className="admin-preview-banner" role="status"><strong>Modo de visualización local.</strong> No hay conexión a PostgreSQL. Los datos y las acciones de escritura no están disponibles.</div> : null}
    <ListFeedback>{children}</ListFeedback>
  </div></div>;
}
