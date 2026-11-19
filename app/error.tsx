"use client";

import Link from "next/link";

export default function Error({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="public-page">
      <div className="public-container not-found-page" role="alert">
        <p className="public-kicker">SALIMO.</p>
        <h1>
          No pudimos cargar <em>esta página.</em>
        </h1>
        <p>Intentá nuevamente en unos momentos.</p>
        <div className="error-actions">
          <button
            type="button"
            onClick={unstable_retry}
            className="public-button"
          >
            Reintentar
          </button>
          <Link href="/" className="public-quiet-link">
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
