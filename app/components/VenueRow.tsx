// VenueRow.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Venue } from "@prisma/client";
import VenueModal from "./VenueModal";

// Datos permitidos para edición desde el modal
type VenueUpdateData = {
  normalizedName: string;
  location: string;
  category: string;
};

export default function VenueRow({ venue }: { venue: Venue }) {
  // Controla estados de carga durante acciones async
  const [isUpdating, setIsUpdating] = useState(false);

  // Controla la visibilidad del modal de edición
  const [isModalOpen, setIsModalOpen] = useState(false);

  const router = useRouter();

  // Alterna entre estado activo e inactivo
  const toggleActiveStatus = async () => {
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !venue.isActive,
        }),
      });

      if (!res.ok) {
        throw new Error("Error toggling active");
      }

      // Refresca los datos del dashboard
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo cambiar el estado.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Actualiza los datos editables del local
  const handleUpdate = async (updatedData: VenueUpdateData) => {
    setIsUpdating(true);

    try {
      // Construcción del payload enviado al backend
      const payload = {
        normalizedName: updatedData.normalizedName,
        location: updatedData.location,
        category: updatedData.category,
      };

      const res = await fetch(`/api/venues/${venue.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();

        console.error("Error update:", res.status, text);

        throw new Error("Error al actualizar");
      }

      // Actualiza la tabla con los nuevos datos
      router.refresh();
    } catch (error) {
      console.error(error);

      // Permite que el modal maneje el error
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Elimina permanentemente un local
  const handleDelete = async () => {
    // Confirmación previa para evitar borrados accidentales
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar permanentemente "${venue.normalizedName}"?`
      )
    ) {
      return;
    }

    setIsUpdating(true);

    try {
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Refresca la lista luego de eliminar
        router.refresh();
      } else {
        alert("Error al intentar eliminar el local.");
      }
    } catch {
      alert("Hubo un error de conexión al eliminar.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
  // Fila correspondiente a un local dentro de la tabla
  <tr
    className={`hover:bg-gray-50 transition-colors ${
      !venue.isActive ? "opacity-60" : ""
    }`}
  >
    {/* Estado actual del local */}
    <td className="px-6 py-4">
      <span
        className={`px-2 inline-flex text-xs font-semibold rounded-full ${
          venue.isActive
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {venue.isActive ? "Activo" : "Inactivo"}
      </span>
    </td>

    {/* Nombre normalizado y nombre original */}
    <td className="px-6 py-4">
      <div className="text-sm font-medium text-gray-900">
        {venue.normalizedName}
      </div>

      <div className="text-xs text-gray-500">
        Original: {venue.originalName}
      </div>
    </td>

    {/* Categoría asignada */}
    <td className="px-6 py-4">
      <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-300">
        {venue.category}
      </span>
    </td>

    {/* Dirección o ubicación */}
    <td className="px-6 py-4 text-sm text-gray-500">
      {venue.location}
    </td>

    {/* Acciones disponibles para el local */}
    <td className="px-6 py-4 text-center text-sm font-medium">
      
      {/* Abre el modal de edición */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-indigo-600 hover:text-indigo-900 mx-2"
        disabled={isUpdating}
      >
        Editar
      </button>

      {/* Alterna entre activo e inactivo */}
      <button
        onClick={toggleActiveStatus}
        disabled={isUpdating}
        className={`${
          venue.isActive
            ? "text-gray-400 hover:text-black"
            : "text-green-600"
        } mx-2 disabled:opacity-50`}
      >
        {isUpdating
          ? "..."
          : venue.isActive
          ? "Desactivar"
          : "Activar"}
      </button>

      {/* Elimina permanentemente el registro */}
      <button
        onClick={handleDelete}
        disabled={isUpdating}
        className="text-red-400 hover:text-red-700 mx-2 transition-colors disabled:opacity-50"
        title="Eliminar permanentemente"
      >
        Eliminar
      </button>

      {/* Modal reutilizable para edición */}
      <VenueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleUpdate}
        initialData={{
          ...venue,

          // Evita valores null en inputs controlados
          normalizedName: venue.normalizedName ?? "",
          category: venue.category ?? "",
        }}
        title="Editar Local"
      />
    </td>
  </tr>
);
}