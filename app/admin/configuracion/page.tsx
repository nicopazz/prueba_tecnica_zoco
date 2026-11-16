import { venueSchemaReady } from "@/lib/public-venues";
import { previewWritesBlocked } from "@/lib/security";
export default async function Configuration() {
  const ready = await venueSchemaReady();
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-5 py-9">
      <h1 className="text-3xl font-bold">Configuración</h1>
      <p className="text-gray-600">Estado operativo. Las credenciales y tokens se administran mediante variables de entorno y nunca se muestran aquí.</p>
      <div className="space-y-3 rounded-xl border bg-white p-5">
        <p><strong>Esquema ampliado:</strong> {ready ? "Disponible" : "Migración pendiente"}</p>
        <p><strong>Escrituras Preview:</strong> {previewWritesBlocked() ? "Bloqueadas" : "Según políticas del entorno"}</p>
        <p><strong>Autenticación:</strong> HTTP Basic para un administrador (provisional).</p>
        <p><strong>Base de datos:</strong> PostgreSQL / Neon.</p>
      </div>
    </main>
  );
}
