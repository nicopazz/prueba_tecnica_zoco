"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useListFeedback } from "@/app/admin/locales/list-feedback";
import AdminLocationPicker from "./AdminLocationPicker";
import { isWithinSalimoArea } from "@/lib/venue-coordinates";
import { cloudinaryImageUrl } from "@/lib/cloudinary-image-url";
import { ACCEPTED_VENUE_IMAGE_TYPES, MAX_VENUE_IMAGE_BYTES, MAX_VENUE_IMAGES } from "@/lib/venue-image-constants";

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
    publicId: string | null;
    alt: string | null;
    sourceUrl: string | null;
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
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const filePreviewUrls = useRef<string[]>([]);
  useEffect(() => () => {
    filePreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);
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

  function replaceSelectedFiles(files: File[]) {
    filePreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    const next = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    filePreviewUrls.current = next.map(({ previewUrl }) => previewUrl);
    setSelectedFiles(next);
  }

  function selectImageFiles(files: File[]) {
    setImageError("");
    setImageStatus("");
    const unsupported = files.find((file) =>
      !ACCEPTED_VENUE_IMAGE_TYPES.some((type) => type === file.type) ||
      file.size > MAX_VENUE_IMAGE_BYTES,
    );
    if (unsupported) {
      setImageError("Usá archivos JPEG, PNG o WebP de hasta 4 MB cada uno.");
      replaceSelectedFiles([]);
      return;
    }
    const available = Math.max(0, MAX_VENUE_IMAGES - (venue?.images?.length || 0));
    if (files.length > available) {
      setImageError(`Podés agregar hasta ${available} fotografía${available === 1 ? "" : "s"} más.`);
    }
    replaceSelectedFiles(files.slice(0, available));
  }

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
    const form = new FormData(imageForm);
    const val = (field: string) => String(form.get(field) || "").trim();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const mode = submitter instanceof HTMLButtonElement ? submitter.value : "upload";
    setImageSaving(true);
    setImageError("");
    setImageStatus("");
    try {
      if (mode === "url") {
        const res = await fetch(`/api/admin/venues/${venue.id}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: val("imageUrl"),
            sourceUrl: val("sourceUrl"),
            attribution: val("attribution"),
            license: val("license"),
            alt: val("alt"),
            authorizationConfirmed: form.get("authorizationConfirmed") === "on",
          }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success)
          throw new Error(result?.error || "No se pudo agregar la fotografía.");
        setImageStatus("Fotografía agregada.");
        imageForm.reset();
        replaceSelectedFiles([]);
        router.refresh();
        return;
      }

      const files = selectedFiles.map(({ file }) => file);
      if (!files.length) throw new Error("Seleccioná al menos una fotografía.");
      const existingCount = venue.images?.length || 0;
      if (existingCount + files.length > MAX_VENUE_IMAGES) {
        throw new Error("La cantidad seleccionada supera el límite de cinco fotografías.");
      }

      let uploadedCount = 0;
      for (const file of files) {
        const uploadForm = new FormData();
        uploadForm.set("file", file, file.name);
        uploadForm.set("sourceUrl", val("sourceUrl"));
        uploadForm.set("attribution", val("attribution"));
        uploadForm.set("license", val("license"));
        uploadForm.set("alt", val("alt"));
        uploadForm.set("authorizationConfirmed", String(form.get("authorizationConfirmed") === "on"));
        setImageStatus(`Subiendo ${uploadedCount + 1} de ${files.length}…`);
        try {
          const res = await fetch(`/api/admin/venues/${venue.id}/images`, {
            method: "POST",
            body: uploadForm,
          });
          const result = await res.json().catch(() => null);
          if (!res.ok || !result?.success)
            throw new Error(result?.error || "No se pudo subir la fotografía.");
          uploadedCount++;
        } catch (uploadError) {
          if (uploadedCount > 0) {
            replaceSelectedFiles(files.slice(uploadedCount));
            const fileInput = imageForm.querySelector<HTMLInputElement>('input[name="files"]');
            if (fileInput) fileInput.value = "";
            setImageStatus(`Se subieron ${uploadedCount} de ${files.length} fotografías.`);
            router.refresh();
          }
          throw uploadError;
        }
      }
      setImageStatus(`Se subrieron ${uploadedCount} fotografía${uploadedCount === 1 ? "" : "s"}.`);
      imageForm.reset();
      replaceSelectedFiles([]);
      router.refresh();
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "No se pudo agregar la fotografía.");
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
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success)
        throw new Error(result?.error || "No se pudo quitar la fotografía.");
      setImageStatus("Fotografía quitada.");
      router.refresh();
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "No se pudo quitar la fotografía.");
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
            Subí JPEG, PNG o WebP de hasta 4 MB cada una, o conservá el registro mediante URL HTTPS. Indicá el origen, el crédito y la licencia o autorización.
          </p>
          {!venue.images?.length ? <p className="admin-venue-meta">Todavía no hay fotografías.</p> : null}
          <p className="admin-venue-meta">
            {venue.images?.length || 0} de {MAX_VENUE_IMAGES} fotografías registradas.
          </p>
          {venue.images?.map((image) => (
            <div
              key={image.id}
              className="admin-image-entry"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cloudinaryImageUrl(image.imageUrl, image.publicId, 240)}
                alt={image.alt || "Fotografía del establecimiento"}
                loading="lazy"
                className="admin-image-preview"
              />
              <div>
                <p>{image.alt || "Sin texto alternativo"}</p>
                <p className="admin-venue-meta">
                  {[image.attribution, image.license, image.sourceUrl].filter(Boolean).join(" · ")}
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
              <label className="admin-image-file">
                Subir fotografías desde tu dispositivo
                <input
                  name="files"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  multiple
                  disabled={(venue.images?.length || 0) >= MAX_VENUE_IMAGES}
                  onChange={(event) => {
                    selectImageFiles(Array.from(event.currentTarget.files || []));
                    event.currentTarget.value = "";
                  }}
                  className={input}
                />
              </label>
              <label>
                O agregá mediante URL HTTPS
                <input name="imageUrl" type="url" className={input} />
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
              <label className="admin-image-authorization">
                <input name="authorizationConfirmed" type="checkbox" required />
                Confirmo que cuento con autorización para usar estas fotografías.
              </label>
            </fieldset>
            {selectedFiles.length ? (
              <div className="admin-image-previews" aria-label="Vista previa de fotografías seleccionadas">
                {selectedFiles.map(({ file, previewUrl }) => (
                  <div key={`${file.name}-${file.lastModified}-${file.size}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt={`Vista previa: ${file.name}`} />
                    <span>{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                ))}
              </div>
            ) : null}
            {imageError ? <p role="alert" className="admin-form-error">{imageError}</p> : null}
            <button
              type="submit"
              value="upload"
              disabled={imageSaving || selectedFiles.length === 0 || (venue.images?.length || 0) >= MAX_VENUE_IMAGES}
              className="admin-action-primary"
            >
              {imageSaving ? "Subiendo…" : "Subir fotografías"}
            </button>
            <button
              type="submit"
              value="url"
              disabled={imageSaving || (venue.images?.length || 0) >= MAX_VENUE_IMAGES}
              className="admin-action-secondary"
            >
              Agregar por URL HTTPS
            </button>
            <span role="status" className="admin-photo-feedback">{imageSaving ? "Actualizando fotografías…" : imageStatus}</span>
          </form>
        </section>
      ) : null}
    </div>
  );
}
