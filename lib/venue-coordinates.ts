// Área operativa amplia: San Miguel de Tucumán y Yerba Buena.
// Esto evita pines en otros continentes por coordenadas ingresadas por error.
// Estar dentro de esta área no verifica que el punto corresponda al comercio.
export function isWithinSalimoArea(latitude: number | null | undefined, longitude: number | null | undefined): boolean {
  return typeof latitude === "number" && typeof longitude === "number"
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -27.1 && latitude <= -26.6
    && longitude >= -65.5 && longitude <= -65.0;
}
