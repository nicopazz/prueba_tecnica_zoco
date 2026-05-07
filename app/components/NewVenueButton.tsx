"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VenueModal from "./VenueModal";

export default function NewVenueButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleCreate = async (data: unknown) => {
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        setIsOpen(false);
        router.refresh(); // Recarga la tabla al instante
      }
    } catch {
      alert("Hubo un error al crear el local.");
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors"
      >
        + Nuevo Local
      </button>

      <VenueModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={handleCreate}
        title="Crear Nuevo Local"
      />
    </>
  );
}