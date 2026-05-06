import { PrismaClient } from "@prisma/client";
import VenueRow from "./components/VenueRow"; // Importamos nuestro nuevo componente

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const venues = await prisma.venue.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-800">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Locales</h1>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors">
            + Nuevo Local
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {venues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No hay datos. Ejecuta el worker para obtener locales.
                  </td>
                </tr>
              ) : (
                // Usamos nuestro componente Cliente para renderizar cada fila
                venues.map((venue) => (
                  <VenueRow key={venue.id} venue={venue} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}