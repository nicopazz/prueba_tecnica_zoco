// Área operativa amplia: San Miguel de Tucumán y Yerba Buena.
// Esto evita pines en otros continentes por coordenadas ingresadas por error.
// Estar dentro de esta área no verifica que el punto corresponda al comercio.
export const latitudeRange = { gte: -27.1, lte: -26.6 };
export const longitudeRange = { gte: -65.5, lte: -65.0 };

export const missingCoordinates = {
  OR: [
    { latitude: null }, { longitude: null },
    { NOT: { latitude: latitudeRange, longitude: longitudeRange } },
  ],
};

export function isWithinSalimoArea(latitude: number | null | undefined, longitude: number | null | undefined): boolean {
  return typeof latitude === "number" && typeof longitude === "number"
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= latitudeRange.gte && latitude <= latitudeRange.lte
    && longitude >= longitudeRange.gte && longitude <= longitudeRange.lte;
}
