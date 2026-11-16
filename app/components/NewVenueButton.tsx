"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VenueModal from "./VenueModal";

type NewVenueInput = { normalizedName: string; location: string; category: string };

export default function NewVenueButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleCreate = async (data: NewVenueInput) => {
    const response = await fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      // El modal conserva los campos y muestra el error sin cerrarse.
      throw new Error(result?.error || "No se pudo crear el local. Volvé a intentar.");
    }
    router.refresh();
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
