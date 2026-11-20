"use client";

import { useEffect, useRef, type ReactNode } from "react";
import PublicIcon from "./PublicIcon";

export default function MapFiltersPanel({ count, children }: { count: number; children: ReactNode }) {
  const panel = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => { if (panel.current) panel.current.open = media.matches; };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <details className="map-filter-panel" ref={panel} onKeyDown={event => {
    if (event.key === "Escape" && panel.current?.open) {
      panel.current.open = false;
      trigger.current?.focus();
    }
  }}>
    <summary ref={trigger}><PublicIcon name="filter" />Filtros{count > 0 && <span aria-label={`${count} filtros activos`}>{count}</span>}</summary>
    <div className="map-filter-fields">{children}</div>
  </details>;
}
