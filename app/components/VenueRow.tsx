// VenueRow.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Venue } from "@prisma/client";
import VenueModal from "./VenueModal";

export default function VenueRow({ venue }: { venue: Venue }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // toggle activo/inactivo
  const toggleActiveStatus = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !venue.isActive }),
      });
      if (!res.ok) throw new Error("Error toggling active");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo cambiar el estado.");
    } finally {
      setIsUpdating(false);
    }
  };

  // handleUpdate se pasa al modal; devuelve promesa para que el modal espere
  const handleUpdate = async (updatedData: any) => {
    setIsUpdating(true);
    try {
      // enviamos sólo los campos editables (puedes ajustar según tu API)
      const payload = {
        normalizedName: updatedData.normalizedName,
        location: updatedData.location,
        category: updatedData.category,
      };

      const res = await fetch(`/api/venues/${venue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Error update:", res.status, text);
        throw new Error("Error al actualizar");
      }

      // refresco datos en la UI
      router.refresh();
    } catch (error) {
      console.error(error);
      throw error; // re-lanzo para que el modal lo capture y muestre alerta
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <tr className={`hover:bg-gray-50 transition-colors ${!venue.isActive ? "opacity-60" : ""}`}>
        <td className="px-6 py-4">
          <span
            className={`px-2 inline-flex text-xs font-semibold rounded-full ${
              venue.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {venue.isActive ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm font-medium text-gray-900">{venue.normalizedName}</div>
          <div className="text-xs text-gray-500">Original: {venue.originalName}</div>
        </td>
        <td className="px-6 py-4">
          <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-300">
            {venue.category}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">{venue.location}</td>
        <td className="px-6 py-4 text-center text-sm font-medium">
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-indigo-600 hover:text-indigo-900 mx-2"
            disabled={isUpdating}
          >
            Editar
          </button>
          <button
            onClick={toggleActiveStatus}
            disabled={isUpdating}
            className={`${venue.isActive ? "text-red-600" : "text-green-600"} mx-2 disabled:opacity-50`}
          >
            {isUpdating ? "..." : venue.isActive ? "Desactivar" : "Activar"}
          </button>
        </td>
      </tr>

      <VenueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleUpdate} // el modal esperará la promesa
        initialData={venue}
        title="Editar Local"
      />
    </>
  );
}
