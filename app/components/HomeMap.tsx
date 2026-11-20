"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PublicMap, { type MapVenue } from "./PublicMap";
import PublicIcon from "./PublicIcon";
import styles from "./HomeMap.module.css";

type HomeMapVenue = MapVenue & { photo?: { url: string; alt: string; attribution: string | null } | null };

export default function HomeMap({ venues, categories }: { venues: HomeMapVenue[]; categories: string[] }) {
  const [category, setCategory] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<HomeMapVenue | null>(null);
  const [previousVenues, setPreviousVenues] = useState(venues);
  if (venues !== previousVenues) {
    setPreviousVenues(venues);
    if (selectedVenue && !venues.some(v => v.id === selectedVenue.id)) setSelectedVenue(null);
  }
  const filtered = useMemo(() => venues.filter(v => !category || v.category === category), [venues, category]);
  const selected = selectedVenue ? filtered.find(v => v.id === selectedVenue.id) ?? null : null;
  const selectVenue = useCallback((id: string | null) => {
    setSelectedVenue(id ? filtered.find(v => v.id === id) || null : null);
  }, [filtered]);
  const selectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected || !window.matchMedia("(max-width: 767px)").matches) return;
    const navbar = document.querySelector<HTMLElement>('nav[aria-label="Navegación móvil"]');
    const card = selectionRef.current?.querySelector<HTMLElement>(`.${styles.venueCard}`);
    if (!navbar || !card) return;
    const attribution = selectionRef.current?.parentElement?.querySelector<HTMLElement>(".leaflet-control-attribution");
    const contentBottom = Math.max(
      card.getBoundingClientRect().bottom,
      attribution?.getBoundingClientRect().bottom ?? 0,
    );
    const overlap = contentBottom - navbar.getBoundingClientRect().top + 8;
    if (overlap > 0) window.scrollBy({ top: overlap, behavior: "smooth" });
  }, [selected]);
  return <div className={styles.discovery}>
    <div className={styles.controls}>
      <Link href="/mapa" className={styles.mapLink}><PublicIcon name="map" />Mapa</Link>
      <Link href="/mapa#filtros"><PublicIcon name="filter" />Filtros</Link>
      <label><PublicIcon name="type" /><span className="sr-only">Filtrar mapa por tipo</span>
        <select value={category} onChange={event => { setCategory(event.target.value); setSelectedVenue(null); }}>
          <option value="">Tipo</option>
          {categories.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
    </div>
    <PublicMap venues={filtered} discovery onSelectVenue={selectVenue} />
    <div className={styles.selection} aria-live="polite" ref={selectionRef}>
      {selected ? <div className={styles.venueCard}>
        <Link href={selected.href} className={styles.venue}>
          {selected.photo ? <span className={styles.thumbnail}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.photo.url} alt={selected.photo.alt} />
          </span> : <span className={styles.noPhoto} aria-label="Sin fotografía verificada"><PublicIcon name="pin" /></span>}
          <span className={styles.venueText}>
            <strong>{selected.name}</strong>
            {selected.city && <small>{selected.city}</small>}
            {selected.category && <small>{selected.category}</small>}
            {selected.photo?.attribution && <small>{selected.photo.attribution}</small>}
          </span>
          <span className={styles.arrow}><PublicIcon name="arrow" /></span>
        </Link>
        <button type="button" className={styles.close} aria-label={`Cerrar tarjeta de ${selected.name}`} onClick={() => setSelectedVenue(null)}>
          <PublicIcon name="close" />
        </button>
      </div> : filtered.length === 0 ? <p className={styles.empty} role="status">Todavía no hay locales{category ? ` de tipo ${category}` : ""} con ubicación disponible.</p> : null}
    </div>
  </div>;
}
