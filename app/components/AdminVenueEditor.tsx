"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
  images?: Array<{ id: string; imageUrl: string; alt: string | null; attribution: string | null; license: string | null }>;
};

export default function AdminVenueEditor({ venue, schemaReady, returnTo = "/admin/locales" }: { venue?: EditableVenue; schemaReady: boolean; returnTo?: "/admin/locales" | "/admin/revision" }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageSaving, setImageSaving] = useState(false);
  const [publicationStatus, setPublicationStatus] = useState(venue?.publicationStatus || "DRAFT");
  const [reviewStatus, setReviewStatus] = useState(venue?.reviewStatus || "PENDING");
  const [city, setCity] = useState(venue?.city || "");
  const [address, setAddress] = useState(venue?.address || (venue?.location?.startsWith("Lat: ") ? "" : venue?.location || ""));
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(
    isWithinSalimoArea(venue?.latitude, venue?.longitude)
      ? { latitude: venue!.latitude!, longitude: venue!.longitude! }
      : null
  );
  const hadInvalidCoordinates = venue?.latitude != null && venue.longitude != null
    && !isWithinSalimoArea(venue.latitude, venue.longitude);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      ...basics, city: val("city") || null, address: val("address") || null,
      description: val("description") || null, phone: val("phone") || null,
      whatsapp: val("whatsapp") || null, instagram: val("instagram") || null,
      website: val("website") || null, openingHours: val("openingHours") || null,
      latitude: position?.latitude ?? null,
      longitude: position?.longitude ?? null,
      reviewStatus, publicationStatus,
      isActive: form.get("isActive") === "on",
      isFeatured: form.get("isFeatured") === "on",
    };
    try {
      if (venue) {
        const url = schemaReady ? `/api/admin/venues/${venue.id}` : `/api/venues/${venue.id}`;
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(schemaReady ? extra : basics),
        });
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "No se pudo guardar");
      } else {
        const res = await fetch("/api/venues", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(basics),
        });
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "No se pudo crear");
        if (schemaReady) {
          const detail = await fetch(`/api/admin/venues/${result.data.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(extra),
          });
          const payload = await detail.json();
          if (!detail.ok || !payload.success) throw new Error(payload.error || "Local creado; no se pudieron completar sus datos");
        }
      }
      router.push(returnTo);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function addImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!venue || !schemaReady) return;
    setImageSaving(true);
    setImageError("");
    const form = new FormData(event.currentTarget);
    const val = (field: string) => String(form.get(field) || "").trim();
    try {
      const res = await fetch(`/api/admin/venues/${venue.id}/images`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: val("imageUrl"), sourceUrl: val("sourceUrl"), attribution: val("attribution"), license: val("license"), alt: val("alt") }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "No se pudo agregar la fotografía");
      router.refresh();
    } catch (e) { setImageError(e instanceof Error ? e.message : "Error"); }
    finally { setImageSaving(false); }
  }

  async function removeImage(id: string) {
    if (!venue || !confirm("¿Quitar la fotografía de la ficha?")) return;
    setImageError("");
    const response = await fetch(`/api/admin/venues/${venue.id}/images/${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else setImageError("No se pudo quitar la fotografía.");
  }

  const input = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2";
  return (
    <div className="space-y-7">
      {!schemaReady ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">La migración de Neon todavía está pendiente. Por seguridad solo se pueden editar los campos originales.</p> : null}
      <form onSubmit={submit} className="space-y-5 rounded-xl border bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">Nombre
            <input name="normalizedName" defaultValue={venue?.normalizedName || venue?.originalName || ""} minLength={2} maxLength={160} required className={input} />
          </label>
          <label className="space-y-1 text-sm font-medium">Categoría
            <select name="category" defaultValue={venue?.category || "Bar"} className={input}>
              {["Bar", "Pub", "Cervecería", "Boliche"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          {venue || !schemaReady ? (
            <label className="space-y-1 text-sm font-medium sm:col-span-2">Ubicación original
              <input name="location" defaultValue={venue?.location || ""} minLength={3} maxLength={250} required className={input} />
            </label>
          ) : null}
        </div>
        {schemaReady ? <>
          <h2 className="border-t pt-4 text-lg font-semibold">Información pública</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium sm:col-span-2">Localidad
              <select name="city" value={city} onChange={event => setCity(event.target.value)} className={input}>
                <option value="">Sin confirmar</option><option>San Miguel de Tucumán</option><option>Yerba Buena</option>
              </select>
            </label>
            {hadInvalidCoordinates ? (
              <p className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                Las coordenadas anteriores están fuera de Tucumán. Seleccioná el lugar correcto en el mapa; no reutilizaremos ese punto inválido.
              </p>
            ) : null}
            <AdminLocationPicker address={address} onAddressChange={setAddress} city={city} position={position} onPositionChange={setPosition} />
            <label className="space-y-1 text-sm font-medium sm:col-span-2">Descripción
              <textarea name="description" defaultValue={venue?.description || ""} maxLength={2000} rows={3} className={input} />
            </label>
            <label className="space-y-1 text-sm font-medium">Teléfono
              <input name="phone" defaultValue={venue?.phone || ""} maxLength={32} className={input} />
            </label>
            <label className="space-y-1 text-sm font-medium">WhatsApp (número con código de país)
              <input name="whatsapp" defaultValue={venue?.whatsapp || ""} maxLength={32} className={input} />
            </label>
            <label className="space-y-1 text-sm font-medium">Instagram (URL completa)
              <input name="instagram" type="url" defaultValue={venue?.instagram || ""} className={input} />
            </label>
            <label className="space-y-1 text-sm font-medium">Sitio web
              <input name="website" type="url" defaultValue={venue?.website || ""} className={input} />
            </label>
            <label className="space-y-1 text-sm font-medium sm:col-span-2">Horarios (texto verificado)
              <textarea name="openingHours" defaultValue={venue?.openingHours || ""} maxLength={500} rows={2} className={input} />
            </label>
          </div>
          <h2 className="border-t pt-4 text-lg font-semibold">Revisión y publicación</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">Revisión
              <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)} className={input}>
                <option value="PENDING">Pendiente</option><option value="REVIEWED">Revisado</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">Visibilidad pública
              <select value={publicationStatus} onChange={(e) => setPublicationStatus(e.target.value)} className={input}>
                <option value="DRAFT">Borrador</option><option value="PUBLISHED">Publicado</option><option value="HIDDEN">Oculto</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex gap-2"><input type="checkbox" name="isActive" defaultChecked={venue?.isActive ?? true} /> Activo</label>
            <label className="flex gap-2"><input type="checkbox" name="isFeatured" defaultChecked={venue?.isFeatured || false} /> Destacado en inicio</label>
          </div>
          <p className="text-xs text-gray-500">Para publicar, primero marcá el local como revisado y completá categoría, localidad y dirección o ubicación suficiente.</p>
        </> : null}
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={saving} className="rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : "Guardar establecimiento"}</button>
      </form>
      {schemaReady && venue ? <section className="space-y-4 rounded-xl border bg-white p-5">
        <h2 className="text-lg font-semibold">Fotografías autorizadas</h2>
        <p className="text-xs text-gray-500">Usá únicamente imágenes con permiso. La carga directa a Cloudinary se habilitará cuando configuremos su cuenta gratuita.</p>
        {venue.images?.map((image) => <div key={image.id} className="flex items-center justify-between gap-3 border-b pb-3">
          <div><p className="break-all text-sm">{image.imageUrl}</p><p className="text-xs text-gray-500">{image.attribution} · {image.license}</p></div>
          <button type="button" onClick={() => removeImage(image.id)} className="text-sm text-red-700 underline">Quitar</button>
        </div>)}
        <form onSubmit={addImage} className="grid gap-3">
          <label className="text-sm">URL https de imagen <input name="imageUrl" type="url" required className={input} /></label>
          <label className="text-sm">Página de origen o autorización <input name="sourceUrl" type="url" required className={input} /></label>
          <label className="text-sm">Crédito / autor <input name="attribution" required className={input} /></label>
          <label className="text-sm">Licencia o permiso <input name="license" required className={input} /></label>
          <label className="text-sm">Texto alternativo <input name="alt" className={input} /></label>
          {imageError ? <p role="alert" className="text-sm text-red-700">{imageError}</p> : null}
          <button type="submit" disabled={imageSaving} className="w-fit rounded-lg border px-4 py-2">{imageSaving ? "Agregando..." : "Agregar fotografía"}</button>
        </form>
      </section> : null}
    </div>
  );
}
