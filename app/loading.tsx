export default function Loading() {
  return (
    <main className="public-page">
      <div
        className="public-container loading-page"
        role="status"
        aria-live="polite"
      >
        <p className="public-kicker">SALIMO.</p>
        <div className="loading-bar" />
        <div className="loading-card" />
        <span className="sr-only">Cargando contenido</span>
      </div>
    </main>
  );
}
