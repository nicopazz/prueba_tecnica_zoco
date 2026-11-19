"use client";

import { useState, useEffect, type FormEvent, useRef, useId } from "react";

interface VenueData {
  normalizedName: string;
  location: string;
  category: string;
}

interface VenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: VenueData) => Promise<void> | void;
  initialData?: VenueData;
  title: string;
}

export default function VenueModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  title,
}: VenueModalProps) {
  const normalizedNameRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [isOpen]);

  if (!isOpen) return null;

  function dismiss() {
    setError("");
    dialogRef.current?.close();
    onClose();
  }

  function requestDismiss() {
    if (!isSubmitting) dismiss();
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const data = {
        normalizedName: normalizedNameRef.current?.value || "",
        location: locationRef.current?.value || "",
        category: categoryRef.current?.value || "Bar",
      };
      await onSave(data);
      dismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar. Volvé a intentar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="admin-modal"
      onClick={(event) => { if (event.target === event.currentTarget) requestDismiss(); }}
      onCancel={(event) => { event.preventDefault(); requestDismiss(); }}
      aria-labelledby={id + "-title"}
    >
      <div>
        <div className="admin-modal-header">
          <h2 id={id + "-title"} className="admin-section-title">{title}</h2>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-form" aria-busy={isSubmitting}>
          <fieldset disabled={isSubmitting} className="admin-form-fields">
            <div>
              <label htmlFor={id + "-name"}>Nombre del local <span className="admin-field-note">(obligatorio)</span></label>
              <input
                id={id + "-name"}
                type="text"
                required
                minLength={2}
                maxLength={160}
                className="w-full"
                defaultValue={initialData?.normalizedName || ""}
                ref={normalizedNameRef}
              />
            </div>

            <div>
              <label htmlFor={id + "-location"}>Ubicación o dirección <span className="admin-field-note">(obligatoria)</span></label>
              <input
                id={id + "-location"}
                type="text"
                required
                minLength={3}
                maxLength={250}
                className="w-full"
                defaultValue={initialData?.location || ""}
                ref={locationRef}
              />
            </div>

            <div>
              <label htmlFor={id + "-category"}>Categoría</label>
              <select
                id={id + "-category"}
                className="w-full"
                defaultValue={initialData?.category || "Bar"}
                ref={categoryRef}
              >
                <option value="Bar">Bar</option>
                <option value="Pub">Pub</option>
                <option value="Cervecería">Cervecería</option>
                <option value="Boliche">Boliche</option>
              </select>
            </div>
          </fieldset>

          {error ? <p role="alert" className="admin-form-error">{error}</p> : null}
          <div className="admin-modal-actions">
            <button
              type="button"
              onClick={requestDismiss}
              disabled={isSubmitting}
              className="admin-action-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-action-primary"
            >
              {isSubmitting ? "Guardando…" : "Guardar local"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
