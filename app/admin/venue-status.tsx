const reviewLabels = new Map([
  ["PENDING", "Revisión pendiente"],
  ["REVIEWED", "Revisado"],
]);

const publicationLabels = new Map([
  ["DRAFT", "Borrador"],
  ["PUBLISHED", "Publicado"],
  ["HIDDEN", "Oculto"],
]);

export function ReviewStatus({ status }: { status?: string }) {
  const label = reviewLabels.get(status ?? "") ?? status;
  return label ? <span className={`admin-status-badge admin-status-${status === "PENDING" ? "pending" : "muted"}`}>{label}</span> : null;
}

export function VenueStatuses({
  isActive,
  reviewStatus,
  publicationStatus,
}: {
  isActive: boolean;
  reviewStatus?: string;
  publicationStatus?: string;
}) {
  const publication = publicationLabels.get(publicationStatus ?? "");
  return (
    <div className="admin-venue-statuses">
      <span className={`admin-status-badge admin-status-${isActive ? "active" : "muted"}`}>
        {isActive ? "Activo" : "Inactivo"}
      </span>
      <ReviewStatus status={reviewStatus}/>
      {publication ? (
        <span className={`admin-status-badge admin-status-${publicationStatus === "PUBLISHED" ? "published" : "muted"}`}>
          {publication}
        </span>
      ) : null}
    </div>
  );
}
