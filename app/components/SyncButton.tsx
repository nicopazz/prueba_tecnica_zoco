"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton({ disabled = false }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function sync() {
    if (loading || disabled) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/sync", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "No se pudo sincronizar.");
      }
      const summary = result.counts;
      setMessage(
        "Sincronizados: " + summary.encontrados +
        ". Nuevos: " + summary.creados +
        ". Actualizados o enriquecidos: " + summary.actualizados +
        ". Pendientes de revisión por conflicto: " + summary.conflictos
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-sync-action">
      <button
        type="button"
        onClick={sync}
        disabled={disabled || loading}
        title={disabled ? "Deshabilitado: la base Preview todavía no está aislada" : "Actualizar datos desde OpenStreetMap"}
        className="admin-action-secondary"
      >
        {loading ? "Sincronizando..." : "Sincronizar"}
      </button>
      <p role="status" className="admin-venue-meta">{message}</p>
    </div>
  );
}
