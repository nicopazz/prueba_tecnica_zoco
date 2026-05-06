// VenueModal.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";

interface VenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void> | void; // puede ser async
  initialData?: any; // si viene, es edición
  title: string;
}

export default function VenueModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  title,
}: VenueModalProps) {
  // estado del formulario
  const [formData, setFormData] = useState({
    normalizedName: "",
    location: "",
    category: "Bar",
  });

  // estado local de envío para deshabilitar botones mientras se guarda
  const [isSubmitting, setIsSubmitting] = useState(false);

  // cuando se abre el modal, cargo initialData; si se cierra, reseteo
  useEffect(() => {
    if (isOpen) {
      setFormData({
        normalizedName: initialData?.normalizedName || "",
        location: initialData?.location || "",
        category: initialData?.category || "Bar",
      });
    } else {
      // opcional: limpiar al cerrar para evitar datos viejos
      setFormData({ normalizedName: "", location: "", category: "Bar" });
      setIsSubmitting(false);
    }
    // sólo reacciono a isOpen y initialData
  }, [isOpen, initialData]);

  // cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // submit local que espera la promesa de onSave si existe
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // permito que onSave sea sync o async
      await onSave(formData);
      // si todo OK, cierro
      onClose();
    } catch (err) {
      // mostrar error simple (podés mejorar con UI)
      console.error("Error guardando desde modal:", err);
      alert("No se pudo guardar. Reintenta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // evitar que el click dentro del modal cierre (solo backdrop)
  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Local</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              value={formData.normalizedName}
              onChange={(e) => setFormData({ ...formData, normalizedName: e.target.value })}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación / Dirección</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Bar">Bar</option>
              <option value="Pub">Pub</option>
              <option value="Cervecería">Cervecería</option>
              <option value="Boliche">Boliche</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
