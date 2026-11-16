import { prisma } from "@/lib/prisma";
import VenueRow from "./components/VenueRow";
import NewVenueButton from "./components/NewVenueButton";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { verifyAdminAuthorization } from "@/lib/security";

// Instancia de Prisma para interactuar con la base de datos


// Fuerza el renderizado dinámico para obtener datos actualizados en cada request
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // Defensa adicional: no consultar la base si se evita el proxy.
  const requestHeaders = await headers();
  if (!verifyAdminAuthorization(requestHeaders.get("authorization"))) notFound();
  // Obtiene los locales ordenados por fecha de creación descendente
  const venues = await prisma.venue.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-800">
      <div className="max-w-6xl mx-auto">
        
        {/* Encabezado principal */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard de Locales
          </h1>

          {/* Botón para crear un nuevo local */}
          <NewVenueButton />
        </div>

        {/* Tabla de locales */}
        <div className="bg-white shadow-md rounded-lg overflow-x-auto border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            
            {/* Cabecera de la tabla */}
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>

                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>

            {/* Contenido de la tabla */}
            <tbody className="bg-white divide-y divide-gray-200">
              {venues.length === 0 ? (
                // Mensaje cuando no existen registros
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No hay datos. Ejecuta el worker para obtener locales.
                  </td>
                </tr>
              ) : (
                // Renderiza una fila por cada local obtenido
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