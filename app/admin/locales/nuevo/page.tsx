import Link from "next/link";
import AdminVenueEditor from "@/app/components/AdminVenueEditor";
import { venueSchemaReady } from "@/lib/public-venues";
export default async function NewVenue() {
  const ready = await venueSchemaReady();
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-9">
      <Link href="/admin/locales" className="text-sm underline">Volver a locales</Link>
      <h1 className="text-3xl font-bold">Nuevo establecimiento</h1>
      <AdminVenueEditor schemaReady={ready} />
    </main>
  );
}
