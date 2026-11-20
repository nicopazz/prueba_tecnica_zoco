"use client";

import { useEffect, useRef, useState } from "react";

export type MapVenue = { id: string; name: string; category: string; city: string; href: string; lat: number; lng: number };
type LeafletMap = {
  setView(center: [number, number], zoom: number): LeafletMap;
  fitBounds(bounds: Array<[number, number]>, options: { padding: [number, number]; maxZoom?: number }): void;
  on(event: string, callback: () => void): LeafletMap;
  remove(): void;
};
type LeafletMarker = {
  addTo(map: LeafletMap): LeafletMarker;
  bindPopup(content: HTMLElement): LeafletMarker;
  getElement(): HTMLElement | undefined;
  on(event: string, callback: () => void): LeafletMarker;
};
type LeafletFactory = {
  divIcon(options: { className: string; iconSize: [number, number] }): unknown;
  map(element: HTMLElement, options?: { scrollWheelZoom: boolean; zoomAnimation: boolean; fadeAnimation: boolean }): LeafletMap;
  tileLayer(url: string, options: { maxZoom: number; attribution: string }): { addTo(map: LeafletMap): void; on(event: string, callback: () => void): void };
  marker(coordinates: [number, number], options?: { title: string; alt: string; keyboard?: boolean; bubblingMouseEvents?: boolean; icon?: unknown }): LeafletMarker;
};

const SCRIPT_ID = "salimo-leaflet-js";
const STYLES_ID = "salimo-leaflet-css";

export default function PublicMap({ venues, compact = false, discovery = false, onSelectVenue }: { venues: MapVenue[]; compact?: boolean; discovery?: boolean; onSelectVenue?: (id: string | null) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [error, setError] = useState("");
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    const mobileMedia = window.matchMedia("(max-width: 767px)");

    function init() {
      if (cancelled || !container.current || mapRef.current) return;
      const leaflet = (window as unknown as { L?: LeafletFactory }).L;
      if (!leaflet) { setError("No se pudo cargar el mapa."); return; }
      try {
        const motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const map = leaflet.map(container.current, { scrollWheelZoom: !compact, zoomAnimation: motion, fadeAnimation: motion }).setView([-26.824, -65.222], 12);
        mapRef.current = map;
        const tiles = leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        });
        let visibleTiles = 0;
        tiles.on("loading", () => { visibleTiles = 0; });
        tiles.on("tileload", () => { visibleTiles++; if (!cancelled) setTilesUnavailable(false); });
        tiles.on("load", () => { if (!cancelled && !visibleTiles) setTilesUnavailable(true); });
        tiles.addTo(map);
        const mobile = mobileMedia.matches;
        if (discovery && mobile && onSelectVenue) {
          map.on("click", () => onSelectVenue(null));
        }
        const dot = compact ? leaflet.divIcon({ className: "admin-map-point", iconSize: [18, 18] }) : mobile ? leaflet.divIcon({ className: "public-map-pin", iconSize: [26, 34] }) : undefined;
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
          const marker = leaflet.marker(coords, { title: venue.name, alt: venue.name, keyboard: true, bubblingMouseEvents: false, ...(dot ? { icon: dot } : {}) }).addTo(map);
          if (discovery && mobile && onSelectVenue) {
            marker.on("click", () => onSelectVenue(venue.id));
            const element = marker.getElement();
            if (element) {
              element.setAttribute("aria-label", venue.name);
              element.addEventListener("keydown", (event) => {
                if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
                  event.preventDefault();
                  onSelectVenue(venue.id);
                }
              });
            }
          } else marker.bindPopup(node);
          bounds.push(coords);
        }
        if (bounds.length === 1) map.setView(bounds[0], 15);
        else if (bounds.length > 1) map.fitBounds(bounds, { padding: discovery && mobile ? [40, 65] : [32, 32], maxZoom: 16 });
        setLoaded(true);
      } catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir el mapa."); }
    }

    const scriptError = () => {
      if (!cancelled) setError("No se pudo descargar el mapa. Revisá tu conexión.");
      document.getElementById(SCRIPT_ID)?.remove();
    };
    const resizePresentation = () => {
      if (compact) return;
      mapRef.current?.remove();
      mapRef.current = null;
      init();
    };
    mobileMedia.addEventListener("change", resizePresentation);
    if (!document.getElementById(STYLES_ID)) {
      const css = document.createElement("link");
      css.id = STYLES_ID;
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
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
      script.addEventListener("error", scriptError);
    }
    return () => {
      cancelled = true;
      mobileMedia.removeEventListener("change", resizePresentation);
      const script = document.getElementById(SCRIPT_ID);
      script?.removeEventListener("load", init);
      script?.removeEventListener("error", scriptError);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [venues, compact, discovery, onSelectVenue]);

  return (
    <div className={compact ? "admin-mini-map" : "space-y-3"}>
      {error ? <p role="alert" className="public-map-status rounded-lg border border-red-200 p-3 text-sm">{error}</p> : null}
      {!loaded && !error ? <p role="status" className="public-map-status text-sm text-gray-600">Cargando mapa...</p> : null}
      {tilesUnavailable && <p role="status" className="public-map-status map-tile-error">No se pudo cargar la cartografía de OpenStreetMap.</p>}
      <div ref={container} className="z-0 w-full overflow-hidden rounded-xl border" style={compact ? undefined : { height: "min(65vh, 640px)", minHeight: 360 }} role="application" aria-label="Mapa de establecimientos" />
      {!compact && <p className="public-map-caption text-xs text-gray-500">Mapa © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>. Solo se muestran locales publicados con coordenadas revisadas. Los centros geométricos importados pueden ser aproximados.</p>}
      {compact && !loaded && <small>Cartografía © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></small>}
    </div>
  );
}
