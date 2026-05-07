"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VenueModal from "./VenueModal";

export default function NewVenueButton() {
  // Controla la apertura y cierre del modal
  const [isOpen, setIsOpen] = useState(false);

  const router = useRouter();

  // Crea un nuevo local desde el formulario del modal
  const handleCreate = async (data: unknown) => {
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(data),
      });

      // Respuesta enviada por la API
      const result = await res.json();

      if (res.ok) {
        // Cierra el modal y actualiza la tabla
        setIsOpen(false);

        router.refresh();
      } else {
        // Muestra errores enviados por el backend
        alert(result.error || "Hubo un error al crear el local.");
      }
    } catch {
      alert("Hubo un error de conexión al crear el local.");
    }
  };

  return (
    <>
      {/* Botón para abrir el modal de creación */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors"
      >
        + Nuevo Local
      </button>

      {/* Modal reutilizable para creación de locales */}
      <VenueModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={handleCreate}
        title="Crear Nuevo Local"
      />
    </>
  );
}