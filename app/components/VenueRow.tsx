// VenueRow.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Venue } from "@prisma/client";
import VenueModal from "./VenueModal";

type VenueRowData = Pick<Venue,
  "id" | "originalName" | "normalizedName" | "location" | "category" | "source" |
  "confidence" | "isActive" | "createdAt" | "updatedAt">;

type VenueUpdateData = {
  normalizedName: string;
  location: string;
  category: string;
};

export default function VenueRow({ venue }: { venue: VenueRowData }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const toggleActiveStatus = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !venue.isActive }),
      });
      if (!res.ok) throw new Error("No se pudo cambiar el estado");
      router.refresh();
    } catch {
      alert("No se pudo cambiar el estado.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdate = async (updatedData: VenueUpdateData) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      router.refresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar permanentemente "${venue.normalizedName}"?`)) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/venues/${venue.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else alert("No se pudo eliminar el local.");
    } catch { alert("Error de conexión."); }
    finally { setIsUpdating(false); }
  };

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${!venue.isActive ? "opacity-60" : ""}`}>
      <td className="px-5 py-4">
        <span className={`rounded-full px-2 text-xs font-semibold ${venue.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {venue.isActive ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td className="px-5 py-4">
        <p className="text-sm font-medium">{venue.normalizedName || venue.originalName}</p>
        <p className="text-xs text-gray-500">Original: {venue.originalName}</p>
      </td>
      <td className="px-5 py-4 text-sm">{venue.category}</td>
      <td className="px-5 py-4 text-sm text-gray-600">{venue.location}</td>
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        <Link href={`/admin/locales/${venue.id}`} className="mr-3 text-indigo-700 underline">Ficha</Link>
        <button onClick={() => setIsModalOpen(true)} disabled={isUpdating} className="mr-3 text-indigo-700 underline">Editar</button>
        <button onClick={toggleActiveStatus} disabled={isUpdating} className="mr-3 underline">{venue.isActive ? "Desactivar" : "Activar"}</button>
        <button onClick={handleDelete} disabled={isUpdating} className="text-red-600 underline">Eliminar</button>
        <VenueModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleUpdate}
          initialData={{ normalizedName: venue.normalizedName || "", location: venue.location, category: venue.category || "Bar" }}
          title="Editar local"
        />
      </td>
    </tr>
  );
}
