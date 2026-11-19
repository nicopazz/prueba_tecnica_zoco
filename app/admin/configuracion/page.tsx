import { venueSchemaReady } from "@/lib/public-venues";
import { previewWritesBlocked } from "@/lib/security";
import Icon, { type AdminIconName } from "../admin-icon";
import { adminEnvironment, adminVisualPreview } from "@/lib/admin-visual-preview";
export default async function Configuration() {
  const visualPreview = adminVisualPreview();
  const ready = visualPreview ? false : await venueSchemaReady();
  const restricted = previewWritesBlocked();
  const settings = [
    { icon: "database", label: "Base de datos", status: visualPreview ? "Sin configurar" : ready ? "Disponible" : "Sin confirmar", tone: ready ? "active" : "pending", detail: "PostgreSQL almacena los locales y el historial de importación." },
    { icon: "server", label: "Entorno", status: adminEnvironment(), tone: "muted", detail: "Entorno de ejecución de esta instancia de SALIMO." },
    { icon: "review", label: "Escrituras Preview", status: visualPreview ? "Solo lectura" : restricted ? "Restringidas" : process.env.VERCEL_ENV === "preview" ? "Habilitadas" : "No aplica", tone: visualPreview || restricted ? "pending" : "muted", detail: "Esta política controla las modificaciones en el entorno Preview." },
    { icon: "lock", label: "Autenticación", status: "Activa", tone: "active", detail: "El acceso al administrador se verifica mediante HTTP Basic." },
    { icon: "layers", label: "Esquema ampliado", status: ready ? "Disponible" : "No comprobado", tone: ready ? "active" : "pending", detail: "Incluye los campos de publicación, las fotografías y el historial." },
  ] satisfies { icon: AdminIconName; label: string; status: string; tone: string; detail: string }[];
  return (
    <main>
      <div className="admin-page-intro"><p>
        Estado del entorno, el acceso administrativo y la conexión a PostgreSQL.
      </p></div>
      <dl className="admin-settings-grid">
        {settings.map(({ icon, label, status, tone, detail }) => (
          <div key={label} className="admin-setting-card">
            <dt><span className="admin-setting-icon"><Icon name={icon}/></span>{label}</dt>
            <dd className="admin-setting-detail">{detail}</dd>
            <dd><span className={`admin-status-badge admin-status-${tone}`}>{status}</span></dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
