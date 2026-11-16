"use client";

import { useEffect, useRef, useState } from "react";

export type MapVenue = { id: string; name: string; category: string; city: string; href: string; lat: number; lng: number };
type LeafletMap = {
  setView(center: [number, number], zoom: number): LeafletMap;
  fitBounds(bounds: Array<[number, number]>, options: { padding: [number, number] }): void;
  remove(): void;
};
type LeafletMarker = {
  addTo(map: LeafletMap): LeafletMarker;
  bindPopup(content: HTMLElement): LeafletMarker;
};
type LeafletFactory = {
  map(element: HTMLElement): LeafletMap;
  tileLayer(url: string, options: { maxZoom: number; attribution: string }): { addTo(map: LeafletMap): void };
  marker(coordinates: [number, number]): LeafletMarker;
};

const SCRIPT_ID = "salimo-leaflet-js";
const STYLES_ID = "salimo-leaflet-css";

export default function PublicMap({ venues }: { venues: MapVenue[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;

    function init() {
      if (cancelled || !container.current || mapRef.current) return;
      const leaflet = (window as unknown as { L?: LeafletFactory }).L;
      if (!leaflet) { setError("No se pudo cargar el mapa."); return; }
      try {
        const map = leaflet.map(container.current).setView([-26.824, -65.222], 12);
        mapRef.current = map;
        leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);
        const bounds: Array<[number, number]> = [];
        for (const venue of venues) {
          if (!Number.isFinite(venue.lat) || !Number.isFinite(venue.lng) ||
            Math.abs(venue.lat) > 90 || Math.abs(venue.lng) > 180) continue;
          const coords: [number, number] = [venue.lat, venue.lng];
          const node = document.createElement("div");
          const title = document.createElement("strong");
          title.textContent = venue.name;
          const detail = document.createElement("p");
          detail.textContent = [venue.category, venue.city].filter(Boolean).join(" · ");
          const link = document.createElement("a");
          link.href = venue.href;
          link.textContent = "Ver ficha";
          link.style.textDecoration = "underline";
          node.append(title, detail, link);
          leaflet.marker(coords).addTo(map).bindPopup(node);
          bounds.push(coords);
        }
        if (bounds.length === 1) map.setView(bounds[0], 15);
        else if (bounds.length > 1) map.fitBounds(bounds, { padding: [32, 32] });
        setLoaded(true);
      } catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir el mapa."); }
    }

    if (!document.getElementById(STYLES_ID)) {
      const css = document.createElement("link");
      css.id = STYLES_ID;
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyo8NL6Y7B3QN8=";
      css.crossOrigin = "anonymous";
      document.head.appendChild(css);
    }

    if ((window as unknown as { L?: LeafletFactory }).L) init();
    else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        script.crossOrigin = "anonymous";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", init);
      script.addEventListener("error", () => { if (!cancelled) setError("No se pudo descargar el mapa. Revisá tu conexión."); });
    }
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [venues]);

  return (
    <div className="space-y-3">
      {error ? <p role="alert" className="rounded-lg border border-red-200 p-3 text-sm">{error}</p> : null}
      {!loaded && !error ? <p role="status" className="text-sm text-gray-600">Cargando mapa...</p> : null}
      <div ref={container} className="z-0 w-full overflow-hidden rounded-xl border" style={{ height: "min(65vh, 640px)", minHeight: 360 }} role="application" aria-label="Mapa de establecimientos" />
      <p className="text-xs text-gray-500">Mapa © OpenStreetMap contributors. Solo se muestran locales publicados con coordenadas revisadas. Los centros geométricos importados pueden ser aproximados.</p>
    </div>
  );
}
