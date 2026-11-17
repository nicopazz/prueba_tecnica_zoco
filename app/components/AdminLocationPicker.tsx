"use client";

import { useEffect, useRef, useState } from "react";
import { isWithinSalimoArea } from "@/lib/venue-coordinates";

type Position = { latitude: number; longitude: number };
type AddressCandidate = Position & { name: string };
type Point = { lat: number; lng: number };
type LeafletMap = {
  setView(point: [number, number], zoom: number): LeafletMap;
  on(event: "click", listener: (event: { latlng: Point }) => void): LeafletMap;
  remove(): void;
};
type LeafletMarker = {
  addTo(map: LeafletMap): LeafletMarker;
  on(event: "dragend", callback: () => void): LeafletMarker;
  getLatLng(): Point;
  setLatLng(point: [number, number]): LeafletMarker;
  remove(): void;
};
type LeafletLibrary = {
  map(container: HTMLElement): LeafletMap;
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
};

export default function AdminLocationPicker({ address, onAddressChange, city, position, onPositionChange }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onPositionRef = useRef(onPositionChange);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [candidates, setCandidates] = useState<AddressCandidate[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => { onPositionRef.current = onPositionChange; }, [onPositionChange]);

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let script: HTMLScriptElement | null = null;

    const initialize = () => {
      if (cancelled || !container.current || mapRef.current) return;
      const leaflet = (window as unknown as { L?: LeafletLibrary }).L;
      if (!leaflet) { setMapError("No se pudo cargar Leaflet."); return; }
      try {
        const map = leaflet.map(container.current);
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
      script.addEventListener("error", () => {
        if (!cancelled) setMapError("No se pudo descargar Leaflet. Podés reintentar recargando la página.");
      });
    }
    return () => {
      cancelled = true;
      script?.removeEventListener("load", initialize);
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
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        if (isWithinSalimoArea(lat, lng)) {
          onPositionRef.current({ latitude: lat, longitude: lng });
          setStatus("Pin movido. Guardá el establecimiento para confirmar.");
        } else {
          setStatus("Ese punto está fuera del área admitida.");
          // Se restaura la posición controlada en el siguiente render.
          marker.setLatLng(point);
        }
      });
      markerRef.current = marker;
    } else markerRef.current.setLatLng(point);
    map.setView(point, 16);
  }, [position, mapLoaded]);

  async function findLocation() {
    if (searching) return;
    setSearching(true);
    setSearchError("");
    setCandidates([]);
    setStatus("");
    try {
      const params = new URLSearchParams({ q: address.trim() });
      if (city) params.set("city", city);
      const response = await fetch("/api/admin/geocode?" + params, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo buscar la dirección.");
      const results = Array.isArray(data.candidates) ? data.candidates as AddressCandidate[] : [];
      setCandidates(results);
      if (!results.length) setSearchError("No encontramos esa dirección. Podés elegir el punto manualmente en el mapa.");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "No se pudo buscar la dirección.");
    } finally { setSearching(false); }
  }

  function choose(candidate: AddressCandidate) {
    if (!isWithinSalimoArea(candidate.latitude, candidate.longitude)) return;
    onPositionChange({ latitude: candidate.latitude, longitude: candidate.longitude });
    setCandidates([]);
    setStatus("Ubicación seleccionada. Comprobá el pin y guardá el establecimiento.");
  }

  return (
    <section className="space-y-3 sm:col-span-2" aria-label="Selección de ubicación">
      <div className="space-y-1">
        <label htmlFor="venue-address" className="block text-sm font-medium">Dirección del establecimiento</label>
        <input id="venue-address" name="address" value={address} onChange={e => onAddressChange(e.target.value)}
          maxLength={250} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
          placeholder="Ej.: México 628, San Miguel de Tucumán" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={findLocation} disabled={searching || address.trim().length < 3}
          className="rounded-lg border border-gray-400 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {searching ? "Buscando ubicación..." : "Buscar ubicación"}
        </button>
        <p className="text-xs text-gray-600">Buscá solo al presionar el botón. No hay autocompletado.</p>
      </div>
      {searchError ? <p role="alert" className="text-sm text-red-700">{searchError}</p> : null}
      {candidates.length ? (
        <div className="space-y-2 rounded-lg border bg-gray-50 p-3">
          <p className="text-sm font-semibold">Elegí el resultado correcto:</p>
          {candidates.map((candidate, index) => (
            <button key={index} type="button" onClick={() => choose(candidate)}
              className="block w-full rounded-lg border bg-white px-3 py-2 text-left text-sm hover:bg-gray-100">
              {candidate.name}
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-sm font-medium">Seleccioná el punto en el mapa o arrastrá el pin.</p>
      {mapError ? <p role="alert" className="text-sm text-red-700">{mapError}</p> : null}
      {!mapLoaded && !mapError ? <p role="status" className="text-sm text-gray-500">Cargando mapa...</p> : null}
      <div ref={container} role="application" aria-label="Mapa para elegir ubicación"
        className="relative z-0 w-full overflow-hidden rounded-lg border border-gray-300" style={{ height: 340 }} />
      {position ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
          <span>Punto seleccionado: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</span>
          <button type="button" onClick={() => { onPositionChange(null); setStatus("Punto quitado. Guardá para actualizar el local."); }} className="underline">
            Quitar punto
          </button>
        </div>
      ) : <p className="text-xs text-gray-600">Sin punto seleccionado. Hacé clic en el mapa para indicar dónde está el local.</p>}
      {status ? <p role="status" className="text-sm text-gray-700">{status}</p> : null}
      <p className="text-xs text-gray-500">
        Ubicación sugerida por © colaboradores de <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>.
        Verificá el punto: una dirección encontrada puede ser aproximada.
      </p>
    </section>
  );
}
