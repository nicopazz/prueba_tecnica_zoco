"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useListFeedback } from "@/app/admin/locales/list-feedback";
import AdminLocationPicker from "./AdminLocationPicker";
import { isWithinSalimoArea } from "@/lib/venue-coordinates";

type EditableVenue = {
  id: string;
  originalName: string;
  normalizedName: string | null;
  location: string;
  category: string | null;
  isActive: boolean;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  website?: string | null;
  openingHours?: string | null;
  isFeatured?: boolean;
  publicationStatus?: string;
  reviewStatus?: string;
  images?: Array<{
    id: string;
    imageUrl: string;
    alt: string | null;
    attribution: string | null;
    license: string | null;
  }>;
};

export default function AdminVenueEditor({
  venue,
  schemaReady,
  visualPreview = false,
  returnTo = "/admin/locales",
}: {
  venue?: EditableVenue;
  schemaReady: boolean;
  visualPreview?: boolean;
  returnTo?: "/admin/locales" | "/admin/revision";
}) {
  const showExtendedFields = schemaReady || visualPreview;
  const router = useRouter();
  const notify = useListFeedback();
  const fieldId = useId();
  const [saving, setSaving] = useState(false);
  const createdVenueId = useRef<string | null>(null);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageStatus, setImageStatus] = useState("");
  const [imageSaving, setImageSaving] = useState(false);
  const [publicationStatus, setPublicationStatus] = useState(
    venue?.publicationStatus || "DRAFT",
  );
  const [reviewStatus, setReviewStatus] = useState(
    venue?.reviewStatus || "PENDING",
  );
  const [city, setCity] = useState(venue?.city || "");
  const [address, setAddress] = useState(
    venue?.address ||
      (venue?.location?.startsWith("Lat: ") ? "" : venue?.location || ""),
  );
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    isWithinSalimoArea(venue?.latitude, venue?.longitude)
      ? { latitude: venue!.latitude!, longitude: venue!.longitude! }
      : null,
  );
  const hadInvalidCoordinates =
    venue?.latitude != null &&
    venue.longitude != null &&
    !isWithinSalimoArea(venue.latitude, venue.longitude);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (visualPreview) return;
    if (saving) return;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const val = (field: string) => String(form.get(field) || "").trim();
    const basics = {
      normalizedName: val("normalizedName"),
      location: venue || !schemaReady ? val("location") : val("address"),
      category: val("category"),
    };
    if (!venue && schemaReady && basics.location.length < 3) {
      setError("Ingresá la dirección del nuevo establecimiento.");
      setSaving(false);
      return;
    }
    const extra = {
      ...basics,
      city: val("city") || null,
      address: val("address") || null,
      description: val("description") || null,
      phone: val("phone") || null,
      whatsapp: val("whatsapp") || null,
      instagram: val("instagram") || null,
      website: val("website") || null,
      openingHours: val("openingHours") || null,
      latitude: position?.latitude ?? null,
      longitude: position?.longitude ?? null,
      reviewStatus,
      publicationStatus,
      isActive: form.get("isActive") === "on",
      isFeatured: form.get("isFeatured") === "on",
    };
    try {
      const existingId = venue?.id || createdVenueId.current;
      if (existingId) {
        const url = schemaReady
          ? `/api/admin/venues/${existingId}`
          : `/api/venues/${existingId}`;
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(schemaReady ? extra : basics),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success)
          throw new Error(result?.error || "No se pudo guardar. Volvé a intentar.");
      } else {
        const res = await fetch("/api/venues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(basics),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success)
          throw new Error(result?.error || "No se pudo crear el local. Volvé a intentar.");
        if (schemaReady) {
          createdVenueId.current = result.data.id;
          const detail = await fetch(`/api/admin/venues/${createdVenueId.current}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(extra),
          });
          const payload = await detail.json().catch(() => null);
          if (!detail.ok || !payload?.success)
            throw new Error(
              payload?.error || "No se pudieron guardar los datos adicionales.",
            );
        }
      }
      notify(venue ? `Se guardaron los cambios de ${basics.normalizedName}.` : `Se creó ${basics.normalizedName}.`, returnTo);
      router.push(returnTo);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al guardar.";
      setError(createdVenueId.current
        ? `El local ya se creó con sus datos básicos. ${message} Al guardar de nuevo se actualizará el mismo registro.`
        : message);
    } finally {
      setSaving(false);
    }
  }

  async function addImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!venue || !schemaReady || imageSaving) return;
    const imageForm = event.currentTarget;
    setImageSaving(true);
    setImageError("");
    setImageStatus("");
    const form = new FormData(imageForm);
    const val = (field: string) => String(form.get(field) || "").trim();
    try {
      const res = await fetch(`/api/admin/venues/${venue.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: val("imageUrl"),
          sourceUrl: val("sourceUrl"),
          attribution: val("attribution"),
          license: val("license"),
          alt: val("alt"),
        }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success)
        throw new Error(result?.error || "No se pudo agregar la fotografía.");
      setImageStatus("Fotografía agregada.");
      imageForm.reset();
      router.refresh();
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Error");
    } finally {
      setImageSaving(false);
    }
  }

  async function removeImage(id: string) {
    if (!venue || imageSaving || !confirm("¿Quitar la fotografía de la ficha?")) return;
    setImageError("");
    setImageStatus("");
    setImageSaving(true);
    try {
      const response = await fetch(`/api/admin/venues/${venue.id}/images/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("No se pudo quitar la fotografía.");
      setImageStatus("Fotografía quitada.");
      router.refresh();
    } catch {
      setImageError("No se pudo quitar la fotografía. Volvé a intentar.");
    } finally {
      setImageSaving(false);
    }
  }

  const input = "w-full";
  return (
    <div className="admin-form-shell">
      {!showExtendedFields ? (
        <p className="admin-form-notice">
          El esquema ampliado está sin confirmar. Podés editar los campos originales.
        </p>
      ) : null}
      <form
        onSubmit={submit}
        className="admin-form-panel"
        aria-busy={saving}
      >
        <fieldset disabled={saving} inert={saving} className="admin-form-fields">
          <h2 className="admin-form-heading">{venue ? venue.normalizedName || venue.originalName : "Información general"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Nombre <span className="admin-field-note">(obligatorio)</span>
              <input
                name="normalizedName"
                defaultValue={venue?.normalizedName || venue?.originalName || ""}
                minLength={2}
                maxLength={160}
                required
                className={input}
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Categoría
              <select
                name="category"
                aria-label="Categoría"
                defaultValue={venue?.category || "Bar"}
                className={input}
              >
                {["Bar", "Pub", "Cervecería", "Boliche"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            {venue || !showExtendedFields ? (
              <label className="space-y-1 text-sm font-medium sm:col-span-2">
                Ubicación original <span className="admin-field-note">(obligatoria)</span>
                <input
                  name="location"
                  defaultValue={venue?.location || ""}
                  minLength={3}
                  maxLength={250}
                  required
                  className={input}
                />
              </label>
            ) : null}
          </div>
          {showExtendedFields ? (
            <>
              <h2 className="admin-form-heading admin-form-divider">
                Ubicación
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium sm:col-span-2">
                  Localidad
                  <select
                    name="city"
                    aria-label="Localidad"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className={input}
                  >
                    <option value="">Sin confirmar</option>
                    <option>San Miguel de Tucumán</option>
                    <option>Yerba Buena</option>
                  </select>
                </label>
                {hadInvalidCoordinates ? (
                  <p className="sm:col-span-2 admin-form-notice">
                    Las coordenadas anteriores están fuera de Tucumán. Seleccioná
                    el lugar correcto en el mapa; no reutilizaremos ese punto
                    inválido.
                  </p>
                ) : null}
                <AdminLocationPicker
                  address={address}
                  onAddressChange={setAddress}
                  city={city}
                  position={position}
                  onPositionChange={setPosition}
                  addressRequired={!venue}
                />
                <div className="grid gap-1 sm:col-span-2">
                  <label htmlFor={fieldId + "-description"}>Descripción</label>
                  <textarea
                    id={fieldId + "-description"}
                    name="description"
                    defaultValue={venue?.description || ""}
                    maxLength={2000}
                    rows={3}
                    className={input}
                  />
                </div>
                <h2 className="admin-form-heading admin-form-divider sm:col-span-2">Contacto y horarios</h2>
                <label className="space-y-1 text-sm font-medium">
                  Teléfono
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={venue?.phone || ""}
                    maxLength={32}
                    className={input}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  WhatsApp (número con código de país)
                  <input
                    name="whatsapp"
                    type="tel"
                    defaultValue={venue?.whatsapp || ""}
                    maxLength={32}
                    className={input}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Instagram (URL completa)
                  <input
                    name="instagram"
                    type="url"
                    defaultValue={venue?.instagram || ""}
                    className={input}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Sitio web
                  <input
                    name="website"
                    type="url"
                    defaultValue={venue?.website || ""}
                    className={input}
                  />
                </label>
                <div className="grid gap-1 sm:col-span-2">
                  <label htmlFor={fieldId + "-hours"}>Horarios (texto verificado)</label>
                  <textarea
                    id={fieldId + "-hours"}
                    name="openingHours"
                    defaultValue={venue?.openingHours || ""}
                    maxLength={500}
                    rows={2}
                    className={input}
                  />
                </div>
              </div>
              <h2 className="admin-form-heading admin-form-divider">
                Revisión y publicación
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">
                  Revisión
                  <select
                    aria-label="Revisión"
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className={input}
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="REVIEWED">Revisado</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Visibilidad pública
                  <select
                    aria-label="Visibilidad pública"
                    value={publicationStatus}
                    onChange={(e) => setPublicationStatus(e.target.value)}
                    className={input}
                  >
                    <option value="DRAFT">Borrador</option>
                    <option value="PUBLISHED">Publicado</option>
                    <option value="HIDDEN">Oculto</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={venue?.isActive ?? true}
                  />{" "}
                  Activo
                </label>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    defaultChecked={venue?.isFeatured || false}
                  />{" "}
                  Destacado en inicio
                </label>
              </div>
              <p className="admin-venue-meta">
                Para publicar, primero marcá el local como revisado y completá
                categoría, localidad y dirección o ubicación suficiente.
              </p>
            </>
          ) : null}
        </fieldset>
        {error ? (
          <p role="alert" className="admin-form-error">
            {error}
          </p>
        ) : null}
        {!visualPreview ? (
          <div className="admin-form-actions">
            <button type="button" disabled={saving} onClick={() => router.push(returnTo)} className="admin-action-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="admin-action-primary">
              {saving ? "Guardando…" : "Guardar establecimiento"}
            </button>
          </div>
        ) : null}
      </form>
      {schemaReady && venue ? (
        <section className="admin-form-panel">
          <h2 className="admin-form-heading">Fotografías autorizadas</h2>
          <p className="admin-venue-meta">
            Agregá una imagen mediante su URL HTTPS e indicá el origen y el permiso de uso. El texto alternativo es opcional.
          </p>
          {!venue.images?.length ? <p className="admin-venue-meta">Todavía no hay fotografías.</p> : null}
          {venue.images?.map((image) => (
            <div
              key={image.id}
              className="admin-image-entry"
            >
              <div>
                <p>{image.alt || image.imageUrl}</p>
                <p className="admin-venue-meta">
                  {[image.attribution, image.license].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                disabled={imageSaving}
                className="admin-action-secondary admin-row-danger"
              >
                Quitar
              </button>
            </div>
          ))}
          <form onSubmit={addImage} aria-busy={imageSaving}>
            <fieldset disabled={imageSaving} className="admin-image-fields">
              <label>
                URL HTTPS de la imagen <span className="admin-field-note">(obligatoria)</span>
                <input name="imageUrl" type="url" required className={input} />
              </label>
              <label>
                Página de origen o autorización <span className="admin-field-note">(obligatoria)</span>
                <input name="sourceUrl" type="url" required className={input} />
              </label>
              <label>
                Crédito / autor <span className="admin-field-note">(obligatorio)</span>
                <input name="attribution" required className={input} />
              </label>
              <label>
                Licencia o permiso <span className="admin-field-note">(obligatorio)</span>
                <input name="license" required className={input} />
              </label>
              <label>
                Texto alternativo <input name="alt" className={input} />
              </label>
            </fieldset>
            {imageError ? <p role="alert" className="admin-form-error">{imageError}</p> : null}
            <button
              type="submit"
              disabled={imageSaving}
              className="admin-action-secondary"
            >
              Agregar fotografía
            </button>
            <span role="status" className="admin-photo-feedback">{imageSaving ? "Actualizando fotografías…" : imageStatus}</span>
          </form>
        </section>
      ) : null}
    </div>
  );
}
