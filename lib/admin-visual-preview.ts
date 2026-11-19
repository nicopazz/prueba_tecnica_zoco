/** Vista administrativa local sin datos. Solo se usa en componentes del servidor. */
export function adminVisualPreview(): boolean {
  return (
    process.env.NODE_ENV === "development" && !process.env.DATABASE_URL?.trim()
  );
}

export function adminEnvironment() {
  if (adminVisualPreview()) return "Sin base local";
  if (process.env.NODE_ENV === "development") return "Desarrollo local";
  if (process.env.VERCEL_ENV === "preview") return "Preview";
  if (process.env.VERCEL_ENV === "production") return "Producción";
  return "Servidor";
}
