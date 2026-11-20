"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PublicMap, { type MapVenue } from "./PublicMap";
import PublicIcon from "./PublicIcon";
import styles from "./HomeMap.module.css";

type HomeMapVenue = MapVenue & { photo?: { url: string; alt: string; attribution: string | null } | null };

export default function HomeMap({ venues, categories }: { venues: HomeMapVenue[]; categories: string[] }) {
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = useMemo(() => venues.filter(v => !category || v.category === category), [venues, category]);
  const selected = filtered.find(v => v.id === selectedId) || filtered[0];
  return <div className={styles.discovery}>
    <div className={styles.controls}>
      <Link href="/mapa" className={styles.mapLink}><PublicIcon name="map" />Mapa</Link>
      <Link href="/mapa#filtros"><PublicIcon name="filter" />Filtros</Link>
      <label><PublicIcon name="type" /><span className="sr-only">Filtrar mapa por tipo</span>
        <select value={category} onChange={event => { setCategory(event.target.value); setSelectedId(null); }}>
          <option value="">Tipo</option>
          {categories.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
    </div>
    <PublicMap venues={filtered} discovery onSelectVenue={setSelectedId} />
    <div className={styles.selection} aria-live="polite">
      {selected ? <Link href={selected.href} className={styles.venue}>
        {selected.photo ? <span className={styles.thumbnail}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selected.photo.url} alt={selected.photo.alt} />
        </span> : <span className={styles.noPhoto} aria-label="Sin fotografía verificada"><PublicIcon name="pin" /></span>}
        <span className={styles.venueText}><strong>{selected.name}</strong><small>{selected.city}</small><small>{selected.category}</small>{selected.photo?.attribution && <small>{selected.photo.attribution}</small>}</span>
        <span className={styles.arrow}><PublicIcon name="arrow" /></span>
      </Link> : <p className={styles.empty}>Todavía no hay locales{category ? ` de tipo ${category}` : ""} con ubicación disponible.</p>}
    </div>
  </div>;
}
