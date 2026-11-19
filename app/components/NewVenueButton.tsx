"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VenueModal from "./VenueModal";
import { useListFeedback } from "@/app/admin/locales/list-feedback";

type NewVenueInput = { normalizedName: string; location: string; category: string };

export default function NewVenueButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const notify = useListFeedback();

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
    notify(`Se creó el local ${data.normalizedName}.`);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="admin-action-primary"
      >
        Nuevo local
      </button>
      <VenueModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={handleCreate}
        title="Nuevo local"
      />
    </>
  );
}
