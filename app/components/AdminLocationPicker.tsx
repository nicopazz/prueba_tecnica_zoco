"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isWithinSalimoArea } from "@/lib/venue-coordinates";

type Position = { latitude: number; longitude: number };
type AddressCandidate = Position & { name: string };
type Point = { lat: number; lng: number };
type LeafletMap = {
  setView(point: [number, number], zoom: number): LeafletMap;
  getCenter(): Point;
  on(event: "click", listener: (event: { latlng: Point }) => void): LeafletMap;
  remove(): void;
};
type LeafletMarker = {
  addTo(map: LeafletMap): LeafletMarker;
  on(event: "dragstart" | "dragend", callback: () => void): LeafletMarker;
  getLatLng(): Point;
  setLatLng(point: [number, number]): LeafletMarker;
  remove(): void;
};
type LeafletLibrary = {
  map(container: HTMLElement, options: { zoomAnimation: boolean; fadeAnimation: boolean }): LeafletMap;
  tileLayer(url: string, options: { maxZoom: number; attribution: string }): { addTo(map: LeafletMap): void };
  marker(point: [number, number], options: { draggable: boolean; autoPan: boolean }): LeafletMarker;
};
const SCRIPT_ID = "salimo-leaflet-js";
const STYLES_ID = "salimo-leaflet-css";

type Props = {
  address: string;
  onAddressChange(value: string): void;
  city: string;
  position: Position | null;
  onPositionChange(position: Position | null): void;
  addressRequired: boolean;
};

export default function AdminLocationPicker({ address, onAddressChange, city, position, onPositionChange, addressRequired }: Props) {
  const instructionsId = useId();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onPositionRef = useRef(onPositionChange);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState("");
  const [lookup, setLookup] = useState<{ key: string; pending: boolean; error: string; results: AddressCandidate[] }>();
  const request = useRef<AbortController | null>(null);
  const searchKey = JSON.stringify([address.trim(), city]);
  const currentLookup = lookup?.key === searchKey ? lookup : undefined;
  const searching = currentLookup?.pending ?? false;
  const searchError = currentLookup?.error;
  const candidates = currentLookup?.results ?? [];
  useEffect(() => () => request.current?.abort(), [searchKey]);
  const [status, setStatus] = useState("");

  useEffect(() => { onPositionRef.current = onPositionChange; }, [onPositionChange]);

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let script: HTMLScriptElement | null = null;

    const loadFailed = () => {
      if (!cancelled) setMapError("No se pudo cargar el mapa. Revisá la conexión.");
      script?.remove();
    };
    const initialize = () => {
      if (cancelled || !container.current || mapRef.current) return;
      const leaflet = (window as unknown as { L?: LeafletLibrary }).L;
      if (!leaflet) { setMapError("No se pudo cargar Leaflet."); return; }
      try {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const map = leaflet.map(container.current, { zoomAnimation: !reducedMotion, fadeAnimation: !reducedMotion });
        map.setView([-26.824, -65.235], 12);
        leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);
        map.on("click", (event) => {
          const { lat, lng } = event.latlng;
          if (isWithinSalimoArea(lat, lng)) {
            onPositionRef.current({ latitude: lat, longitude: lng });
            setStatus("Pin seleccionado en el mapa. Guardá el establecimiento para confirmar.");
          } else setStatus("Seleccioná un punto dentro de Tucumán.");
        });
        mapRef.current = map;
        setMapLoaded(true);
      } catch {
        setMapError("No se pudo inicializar el mapa. Revisá la conexión.");
      }
    };

    if (!document.getElementById(STYLES_ID)) {
      const link = document.createElement("link");
      link.id = STYLES_ID;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }
    if ((window as unknown as { L?: LeafletLibrary }).L) initialize();
    else {
      script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        script.crossOrigin = "anonymous";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", initialize);
      script.addEventListener("error", loadFailed);
    }
    return () => {
      cancelled = true;
      script?.removeEventListener("load", initialize);
      script?.removeEventListener("error", loadFailed);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = (window as unknown as { L?: LeafletLibrary }).L;
    if (!mapLoaded || !map || !leaflet) return;
    if (!position || !isWithinSalimoArea(position.latitude, position.longitude)) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const point: [number, number] = [position.latitude, position.longitude];
    if (!markerRef.current) {
      const marker = leaflet.marker(point, { draggable: true, autoPan: true }).addTo(map);
      let dragOrigin = marker.getLatLng();
      marker.on("dragstart", () => { dragOrigin = marker.getLatLng(); });
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        if (isWithinSalimoArea(lat, lng)) {
          onPositionRef.current({ latitude: lat, longitude: lng });
          setStatus("Pin movido. Guardá el establecimiento para confirmar.");
        } else {
          setStatus("Ese punto está fuera del área admitida.");
          marker.setLatLng([dragOrigin.lat, dragOrigin.lng]);
        }
      });
      markerRef.current = marker;
    } else markerRef.current.setLatLng(point);
    map.setView(point, 16);
  }, [position, mapLoaded]);

  async function findLocation() {
    if (searching) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLookup({ key: searchKey, pending: true, error: "", results: [] });
    setStatus("");
    try {
      const params = new URLSearchParams({ q: address.trim() });
      if (city) params.set("city", city);
      const response = await fetch("/api/admin/geocode?" + params, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo buscar la dirección.");
      const results = Array.isArray(data.candidates) ? data.candidates as AddressCandidate[] : [];
      if (!controller.signal.aborted) setLookup({ key: searchKey, pending: false, results,
        error: results.length ? "" : "No encontramos esa dirección. Podés elegir el punto manualmente en el mapa." });
    } catch (error) {
      if (!controller.signal.aborted) setLookup({ key: searchKey, pending: false, results: [],
        error: error instanceof Error && !(error instanceof TypeError) ? error.message : "No se pudo buscar la dirección. Revisá la conexión." });
    } finally {
      if (controller.signal.aborted && request.current === controller) setLookup(undefined);
    }
  }

  function choose(candidate: AddressCandidate) {
    if (!isWithinSalimoArea(candidate.latitude, candidate.longitude)) return;
    onPositionChange({ latitude: candidate.latitude, longitude: candidate.longitude });
    setLookup(undefined);
    setStatus("Ubicación seleccionada. Comprobá el pin y guardá el establecimiento.");
  }

  return (
    <section className="admin-location-picker sm:col-span-2" aria-label="Selección de ubicación">
      <div className="admin-location-search"><div className="space-y-1">
        <label htmlFor="venue-address" className="block">
          Dirección del establecimiento {addressRequired ? <span className="admin-field-note">(obligatoria)</span> : null}
        </label>
        <input id="venue-address" name="address" value={address} onChange={e => onAddressChange(e.target.value)}
          required={addressRequired} minLength={addressRequired ? 3 : undefined}
          maxLength={250} className="w-full"
          placeholder="Ej.: México 628, San Miguel de Tucumán" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={findLocation} disabled={searching || address.trim().length < 3}
          className="admin-action-secondary">
          {searching ? "Buscando ubicación..." : "Buscar ubicación"}
        </button>
        {address.trim().length < 3 && <p className="admin-venue-meta">Escribí al menos tres caracteres para buscar.</p>}
      </div>
      {searchError ? <p role="alert" className="admin-form-error">{searchError}</p> : null}
      {candidates.length ? (
        <div className="admin-address-results">
          <p className="text-sm font-semibold">Elegí el resultado correcto:</p>
          {candidates.map((candidate, index) => (
            <button key={index} type="button" onClick={() => choose(candidate)}
              className="admin-location-option">
              {candidate.name}
            </button>
          ))}
        </div>
      ) : null}
      </div>
      <div className="admin-map-picker-body"><p id={instructionsId} className="admin-venue-meta">
        Elegí un punto o arrastrá el pin. Con el mapa enfocado, movelo con las flechas y presioná Enter para elegir el centro.
      </p>
      {mapError ? <p role="alert" className="admin-form-error">{mapError}</p> : null}
      {!mapLoaded && !mapError ? <p role="status" className="admin-venue-meta">Cargando mapa…</p> : null}
      <div className="admin-location-frame" hidden={Boolean(mapError)}>
        <div ref={container} role="application" aria-label="Mapa para elegir ubicación"
          aria-describedby={instructionsId}
          tabIndex={mapLoaded ? 0 : undefined}
          className="admin-location-map"
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.target !== event.currentTarget || !mapRef.current) return;
            event.preventDefault();
            const { lat, lng } = mapRef.current.getCenter();
            if (!isWithinSalimoArea(lat, lng)) {
              setStatus("Seleccioná un punto dentro de Tucumán.");
              return;
            }
            onPositionChange({ latitude: lat, longitude: lng });
            setStatus("Pin seleccionado en el mapa. Guardá el establecimiento para confirmar.");
          }}
        />
      </div>
      {position ? (
        <div className="flex flex-wrap items-center justify-between gap-2 admin-venue-meta">
          <span>Punto seleccionado: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</span>
          <button type="button" onClick={() => { onPositionChange(null); setStatus("Punto quitado. Guardá para actualizar el local."); container.current?.focus(); }} className="admin-action-secondary">
            Quitar punto
          </button>
        </div>
      ) : <p className="admin-venue-meta">Sin punto seleccionado.</p>}
      <p role="status" className="admin-venue-meta">{status}</p>
      <p className="admin-venue-meta">
        Ubicación sugerida por © colaboradores de <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>.
        Verificá el punto: una dirección encontrada puede ser aproximada.
      </p></div>
    </section>
  );
}
