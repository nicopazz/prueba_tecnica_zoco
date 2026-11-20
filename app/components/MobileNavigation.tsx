"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import PublicIcon, { type PublicIconName } from "./PublicIcon";
import styles from "./MobileNavigation.module.css";

const destinations: { label: string; href: string; icon: PublicIconName }[] = [
  { label: "Inicio", href: "/", icon: "home" },
  { label: "Explorar", href: "/explorar", icon: "search" },
  { label: "Mapa", href: "/mapa", icon: "map" },
  { label: "La guía", href: "/guia", icon: "book" },
];

export function MobileMenu() {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const open = openPath === pathname;
  function close() { setOpenPath(null); trigger.current?.focus(); }
  return <div className={styles.menu} onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
    <button ref={trigger} type="button" className={styles.menuButton} aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} aria-controls="public-mobile-menu" onClick={() => setOpenPath(open ? null : pathname)}>
      <PublicIcon name={open ? "close" : "menu"} />
    </button>
    {open && <>
      <button className={styles.backdrop} tabIndex={-1} aria-label="Cerrar menú" onClick={close} />
      <nav id="public-mobile-menu" className={styles.menuPanel} aria-label="Menú móvil">
        {[...destinations, { label: "Datos y fuentes", href: "/fuentes", icon: "book" as const }].map(item => <Link key={item.href} href={item.href} onClick={() => setOpenPath(null)} aria-current={pathname === item.href ? "page" : undefined}><PublicIcon name={item.icon} />{item.label}</Link>)}
      </nav>
    </>}
  </div>;
}

export default function MobileNavigation() {
  const pathname = usePathname();
  const [notice, setNotice] = useState(false);
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  function itemLink(item: typeof destinations[number]) {
    const active = pathname === item.href || (item.href === "/explorar" && pathname.startsWith("/lugares/")) || (item.href === "/guia" && pathname === "/fuentes");
    return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setNotice(false)}><PublicIcon name={item.icon} /><span>{item.label}</span></Link>;
  }
  return <div className={styles.mobileNavigation}>
    {notice && <div className={styles.notice}>
      <p role="status"><strong>Favoritos, próximamente.</strong> Por ahora podés descubrir lugares desde Explorar.</p>
      <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice(false)}><PublicIcon name="close" /></button>
    </div>}
    <nav className={styles.bottom} aria-label="Navegación móvil">
      {destinations.slice(0, 3).map(itemLink)}
      <button type="button" aria-label="Favoritos: próximamente" aria-expanded={notice} onClick={() => setNotice(!notice)}><PublicIcon name="heart" /><span>Favoritos</span></button>
      {itemLink(destinations[3])}
    </nav>
  </div>;
}
