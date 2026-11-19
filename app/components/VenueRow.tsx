"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Venue } from "@prisma/client";
import Icon from "@/app/admin/admin-icon";
import { VenueStatuses } from "@/app/admin/venue-status";
import VenueModal from "./VenueModal";
import { useListFeedback } from "@/app/admin/locales/list-feedback";

type VenueRowData = Pick<Venue,
  "id" | "originalName" | "normalizedName" | "location" | "category" | "isActive">
  & Partial<Pick<Venue, "city" | "address" | "reviewStatus" | "publicationStatus">>;

type VenueUpdateData = {
  normalizedName: string;
  location: string;
  category: string;
};

function positionActions(button: HTMLButtonElement, panel: HTMLDivElement) {
  const rect = button.getBoundingClientRect();
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
    panel.hidePopover();
    return;
  }
  panel.style.right = Math.max(8, window.innerWidth - rect.right) + "px";
  const above = rect.bottom + 160 > window.innerHeight && rect.top > 160;
  panel.style.top = above ? "auto" : rect.bottom + 4 + "px";
  panel.style.bottom = above ? window.innerHeight - rect.top + 4 + "px" : "auto";
}

export default function VenueRow({ venue, modified }: { venue: VenueRowData; modified: string }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const router = useRouter();
  const name = venue.normalizedName || venue.originalName;
  const popoverId = useId();
  const popup = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const notify = useListFeedback();
  const [refreshing, startTransition] = useTransition();
  const busy = isUpdating || refreshing;

  useEffect(() => {
    if (!actionsOpen) return;
    const update = () => {
      if (trigger.current && popup.current) positionActions(trigger.current, popup.current);
    };
    window.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [actionsOpen]);

  function closeActions() {
    popup.current?.hidePopover();
    trigger.current?.focus();
  }

  function saved(message: string) {
    notify(message);
    startTransition(() => router.refresh());
  }

  const toggleActiveStatus = async () => {
    closeActions();
    setIsUpdating(true);
    setActionError("");
    try {
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !venue.isActive }),
      });
      if (!res.ok) throw new Error("No se pudo cambiar el estado");
      saved(`${name}: ${venue.isActive ? "desactivado" : "activado"}.`);
    } catch {
      setActionError("No se pudo cambiar el estado. Volvé a intentar.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdate = async (updatedData: VenueUpdateData) => {
    setIsUpdating(true);
    setActionError("");
    try {
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.error || "No se pudo guardar. Volvé a intentar.");
      }
      saved(`Se guardaron los cambios de ${updatedData.normalizedName}.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm(`¿Archivar "${name}"? El local dejará de mostrarse en la web pública.`)) return;
    closeActions();
    setIsUpdating(true);
    setActionError("");
    try {
      const res = await fetch(`/api/venues/${venue.id}`, { method: "DELETE" });
      if (res.ok) saved(`Se archivó ${name}.`);
      else setActionError("No se pudo archivar el local. Volvé a intentar.");
    } catch { setActionError("Error de conexión. Volvé a intentar."); }
    finally { setIsUpdating(false); }
  };

  return (
    <tr role="row">
      <td role="cell" className="admin-venue-identity">
        <p className="admin-venue-name">{name}</p>
        <p className="admin-venue-meta">{venue.category || "Sin categoría"}</p>
        {venue.normalizedName && venue.normalizedName !== venue.originalName ? (
          <p className="admin-venue-original">Original: {venue.originalName}</p>
        ) : null}
      </td>
      <td role="cell" className="admin-venue-location">
        <p>{venue.address || venue.location || "Sin ubicación"}</p>
        {venue.city ? <p className="admin-venue-meta">{venue.city}</p> : null}
      </td>
      <td role="cell">
        <VenueStatuses {...venue} />
      </td>
      <td role="cell" className="admin-venue-meta"><span className="admin-modified-label">Modificado </span>{modified}</td>
      <td role="cell" className="admin-venue-actions"><div className="admin-row-actions" role="group" aria-label={`Acciones para ${name}`}>
        <button type="button" className="admin-action-secondary admin-row-edit" onClick={() => setIsModalOpen(true)} disabled={busy} aria-label={`Editar ${name}`}><Icon name="edit" size={14}/>Editar</button>
        <button ref={trigger} type="button" popoverTarget={popoverId} disabled={busy} aria-expanded={actionsOpen}
          className="admin-action-secondary admin-more" aria-label={`Más acciones para ${name}`}>•••</button>
        <div id={popoverId} ref={popup} popover="auto" className="admin-row-popup" role="group" aria-label={`Acciones adicionales para ${name}`}
          onToggle={event => setActionsOpen(event.newState === "open")}
          onBeforeToggle={event => {
            if (event.newState !== "open" || !trigger.current) return;
            trigger.current.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
            positionActions(trigger.current, event.currentTarget);
          }}
          onBlur={event => {
            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== trigger.current) {
              event.currentTarget.hidePopover();
            }
          }}>
        <Link className="admin-action-secondary" href={`/admin/locales/${venue.id}`}>Ficha</Link>
        <button type="button" className="admin-action-secondary" onClick={toggleActiveStatus} disabled={isUpdating}>{venue.isActive ? "Desactivar" : "Activar"}</button>
        {venue.isActive ? <button type="button" onClick={handleArchive} disabled={isUpdating} className="admin-action-secondary admin-row-danger">Archivar</button> : null}
        </div>
        </div>
        {actionError ? <p role="alert" className="admin-form-error">{actionError}</p> : null}
        <VenueModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleUpdate}
          initialData={{ normalizedName: venue.normalizedName || venue.originalName, location: venue.location, category: venue.category || "Bar" }}
          title="Editar local"
        />
      </td>
    </tr>
  );
}
