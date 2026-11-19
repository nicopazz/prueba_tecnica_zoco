"use client";

import { usePathname } from "next/navigation";

export default function AdminLoading() {
  const dashboard = usePathname() === "/admin";
  return <main className="admin-loading">
    <p role="status">Cargando {dashboard ? "resumen" : "datos del administrador"}…</p>
    <div aria-hidden="true" className={dashboard ? "admin-loading-grid" : "admin-loading-list"}>
      {Array.from({ length: dashboard ? 8 : 4 }, (_, index) =>
        <div key={index}><i/><i/></div>)}
    </div>
  </main>;
}
