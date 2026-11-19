import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const url = new URL(process.env.DATABASE_URL || "postgresql://invalid/");
const containerName = process.env.SALIMO_AUDIT_CONTAINER || "";
if (
  url.protocol !== "postgresql:" ||
  url.hostname !== "127.0.0.1" ||
  url.pathname !== "/salimo_audit" ||
  decodeURIComponent(url.username) !== "salimo_audit" ||
  !/^salimo-audit-[a-f0-9]{10}$/.test(containerName)
) {
  throw new Error("La auditoría requiere la base local aislada salimo_audit.");
}

const container = JSON.parse(
  execFileSync("docker", ["inspect", containerName], { encoding: "utf8" }),
)[0];
const binding = container.NetworkSettings.Ports["5432/tcp"]?.[0];
if (
  container.Config.Labels["salimo.purpose"] !== "isolated-admin-audit" ||
  container.Config.Image !== "postgres:16-alpine" ||
  binding?.HostIp !== "127.0.0.1" ||
  binding.HostPort !== url.port
) {
  throw new Error("El contenedor no coincide con la base de auditoría.");
}

const prisma = new PrismaClient();
const ids = Array.from({ length: 6 }, (_, index) => `salimo-audit-local-${index + 1}`);
const data = [
  { originalName: "AUDIT LOCAL · Escenario 1", normalizedName: "AUDIT LOCAL · Escenario 1", location: "Dirección ficticia 101", category: "Bar", city: "San Miguel de Tucumán", address: "Dirección ficticia 101", latitude: -26.824, longitude: -65.222, description: "Registro ficticio de auditoría local.", phone: "3810000001", isActive: true, reviewStatus: "REVIEWED", publicationStatus: "PUBLISHED", slug: "audit-local-escenario-1", isFeatured: true },
  { originalName: "AUDIT LOCAL · Escenario 2", normalizedName: "AUDIT LOCAL · Escenario 2", location: "Dirección ficticia 202", category: "Pub", city: "Yerba Buena", address: "Dirección ficticia 202", latitude: null, longitude: null, isActive: true, reviewStatus: "REVIEWED", publicationStatus: "PUBLISHED", slug: "audit-local-escenario-2" },
  { originalName: "AUDIT LOCAL · Escenario 3", normalizedName: "AUDIT LOCAL · Escenario 3", location: "Ubicación pendiente de verificar", category: "Cervecería", city: null, address: null, isActive: true, reviewStatus: "PENDING", publicationStatus: "DRAFT" },
  { originalName: "AUDIT LOCAL · Escenario 4", normalizedName: "AUDIT LOCAL · Escenario 4", location: "Dirección ficticia 404", category: "Boliche", city: "San Miguel de Tucumán", address: "Dirección ficticia 404", isActive: false, reviewStatus: "PENDING", publicationStatus: "DRAFT" },
  { originalName: "AUDIT LOCAL · Escenario 5", normalizedName: "AUDIT LOCAL · Escenario 5", location: "Dirección ficticia 505", category: "Bar", city: "San Miguel de Tucumán", address: "Dirección ficticia 505", isActive: true, reviewStatus: "REVIEWED", publicationStatus: "DRAFT" },
  { originalName: "AUDIT LOCAL · Escenario 6", normalizedName: "AUDIT LOCAL · Escenario 6", location: "Dirección ficticia 606", category: "Pub", city: "Yerba Buena", address: "Dirección ficticia 606", isActive: true, reviewStatus: "REVIEWED", publicationStatus: "HIDDEN" },
];

try {
  const identity = await prisma.$queryRaw`SELECT current_database() AS name`;
  if (identity[0]?.name !== "salimo_audit") throw new Error("Base inesperada.");
  if (process.argv[2] === "--seed") {
    for (const [index, venue] of data.entries()) {
      await prisma.venue.upsert({
        where: { id: ids[index] },
        create: { id: ids[index], source: "AUDIT_LOCAL", confidence: null, ...venue },
        update: venue,
      });
    }
    await prisma.syncRun.upsert({
      where: { id: "salimo-audit-sync-completed" },
      create: { id: "salimo-audit-sync-completed", status: "SUCCESS", triggeredBy: "AUDIT_LOCAL", foundCount: 6, createdCount: 6 },
      update: { status: "SUCCESS", triggeredBy: "AUDIT_LOCAL", foundCount: 6, createdCount: 6 },
    });
    await prisma.syncRun.upsert({
      where: { id: "salimo-audit-sync-failed" },
      create: { id: "salimo-audit-sync-failed", status: "FAILED", triggeredBy: "AUDIT_LOCAL", errorMessage: "Falla ficticia de auditoría" },
      update: { status: "FAILED", triggeredBy: "AUDIT_LOCAL", errorMessage: "Falla ficticia de auditoría" },
    });
    console.log("Cargados 6 locales y 2 ejecuciones ficticias de auditoría local.");
  } else if (process.argv[2] === "--cleanup") {
    await prisma.venueImage.deleteMany({ where: { venueId: { in: ids } } });
    await prisma.venue.deleteMany({ where: { id: { in: ids } } });
    await prisma.syncRun.deleteMany({ where: { id: { in: ["salimo-audit-sync-completed", "salimo-audit-sync-failed"] } } });
    console.log("Registros fijos de auditoría eliminados.");
  } else if (process.argv[2] === "--clean-test-runs") {
    const temporary = await prisma.venue.findMany({
      where: {
        source: "Manual",
        OR: [
          { normalizedName: { startsWith: "Prueba QA " } },
          { normalizedName: { startsWith: "Salimo QA " } },
          { normalizedName: { startsWith: "AUDIT LOCAL · UI " } },
        ],
      },
      select: { id: true },
    });
    const temporaryIds = temporary.map((venue) => venue.id);
    await prisma.venueImage.deleteMany({ where: { venueId: { in: temporaryIds } } });
    await prisma.venue.deleteMany({ where: { id: { in: temporaryIds } } });
    console.log(`Eliminados ${temporaryIds.length} registros temporales de pruebas.`);
  } else {
    throw new Error("Usá --seed, --cleanup o --clean-test-runs.");
  }
} finally {
  await prisma.$disconnect();
}
