import Link from "next/link";
import AdminVenueEditor from "@/app/components/AdminVenueEditor";
import { venueSchemaReady } from "@/lib/public-venues";
import { adminVisualPreview } from "@/lib/admin-visual-preview";
export default async function NewVenue() {
  const visualPreview = adminVisualPreview();
  const ready = visualPreview ? false : await venueSchemaReady();
  return (
    <main className="admin-editor-page">
      <Link href="/admin/locales" className="admin-back-link">
        Volver a locales
      </Link>
      {visualPreview ? (
        <>
          <p className="admin-empty">
            Formulario visible para auditoría. Los campos y el guardado están
            deshabilitados hasta configurar PostgreSQL.
          </p>
          <div inert className="admin-readonly">
            <AdminVenueEditor schemaReady={ready} visualPreview />
          </div>
        </>
      ) : (
        <AdminVenueEditor schemaReady={ready} />
      )}
    </main>
  );
}
