"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "../admin/admin-icon";
import { useRef } from "react";

const sections = [
  { href: "/admin", label: "Resumen", detail: "Estado general de los establecimientos", icon: "home" },
  { href: "/admin/locales", label: "Locales", detail: "Gestión de establecimientos", icon: "store" },
  { href: "/mapa", label: "Mapa público", detail: "Locales publicados con ubicación", icon: "pin" },
  { href: "/admin/revision", label: "Revisión", detail: "Control de calidad y publicación", icon: "review" },
  { href: "/admin/sincronizaciones", label: "Sincronizaciones", detail: "Importación e historial", icon: "sync" },
  { href: "/admin/configuracion", label: "Configuración", detail: "Estado del entorno", icon: "settings" },
] as const;

function sectionFor(path: string) {
  if (path.startsWith("/admin/locales/nuevo")) return { label: "Nuevo establecimiento", detail: "Carga y revisión de información" };
  if (path.startsWith("/admin/locales/")) return { label: "Editar establecimiento", detail: "Datos y estado de publicación" };
  return sections.find((section) => path === section.href) ?? sections[0];
}

export default function AdminNavigation({ environment }: { environment: string }) {
  const path = usePathname();
  const current = sectionFor(path);
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => mobileMenu.current?.removeAttribute("open");
  const links = (mobile = false) => sections.map((section) => {
    const active = section.href === "/admin" ? path === "/admin" : path === section.href || path.startsWith(section.href + "/");
    return <Link key={section.href} href={section.href} onClick={mobile ? () => {
      closeMenu();
      mobileMenu.current?.querySelector("summary")?.focus();
    } : undefined} aria-current={active ? (path === section.href ? "page" : "location") : undefined} className="admin-side-link"><Icon name={section.icon}/><span>{section.label}</span></Link>;
  });
  return <>
    <a className="admin-skip" href="#contenido-admin">Saltar al contenido</a>
    <aside className="admin-sidebar" aria-label="Navegación administrativa">
      <Link href="/admin" className="admin-side-brand">SALIMO<span>.</span></Link>
      <nav aria-label="Secciones del administrador">{links()}</nav>
      <div className="admin-side-bottom"><div className="admin-origin">
        <svg className="admin-signature" viewBox="0 0 200 94" fill="none" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
            <path d="m58 55 18-12 7 3 22-18 13 9 9-3 18 12 8-4 23 12 14-2M6 68l10-4 10 1V40h18v27l13 5m-28-32v-9h12v9m-14-9 8-8 8 8m-8-9v-8m-3 32v8m6-8v8M50 78v-9h23v9m6-16h37v16m-32-16 14-8 14 8m10 16V65h35v13m5 0V68h25"/>
            <path d="M8 84h181" opacity=".5"/>
          </g><path d="M9 92q74-20 181-6" stroke="var(--salimo-coral)" strokeWidth="2.5"/>
        </svg><strong>Tucumán</strong><small>Bares · Pubs · Cervecerías</small></div><Link href="/" className="admin-side-link"><Icon name="external"/><span>Web pública</span></Link></div>
    </aside>
    <div className="admin-mobile-nav">
      <Link href="/admin" onClick={closeMenu} className="admin-side-brand">SALIMO<span>.</span></Link>
      <details ref={mobileMenu} onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) closeMenu();
      }} onKeyDown={(event) => {
        if (event.key === "Escape" && mobileMenu.current?.open) {
          closeMenu();
          mobileMenu.current.querySelector("summary")?.focus();
        }
      }}>
        <summary>Menú <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary>
        <nav aria-label="Navegación administrativa móvil">{links(true)}<Link href="/" onClick={closeMenu} className="admin-side-link"><Icon name="external"/>Web pública</Link></nav>
      </details>
    </div>
    <header className="admin-topbar">
      <nav className="admin-crumb" aria-label="Ruta de navegación"><Link href="/admin">Administración</Link><span aria-hidden="true">/</span><strong aria-current="page">{current.label}</strong></nav>
      <span className="admin-environment">{environment}</span>
    </header>
    {path !== "/admin" && <div className="admin-module-title"><h1>{current.label}</h1></div>}
  </>;
}
