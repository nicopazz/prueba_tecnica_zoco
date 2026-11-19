import assert from "node:assert/strict";
import test from "node:test";
import { readSyncSummary, summarizeCatalog, describePriority } from "../lib/dashboard.ts";
import { parseList } from "../app/admin/locales/list-query.ts";
import { missingCoordinates } from "../lib/venue-coordinates.ts";

const complete = {
  id: "a", originalName: "Cervecería Sur", normalizedName: "Cervecería Sur", category: "Cervecería",
  address: "Salta 123", location: "Salta 123", city: "San Miguel de Tucumán",
  latitude: -26.8, longitude: -65.22, imageCount: 1, description: "Patio", isActive: true,
  isPending: false, differentNames: false, sharedName: null,
};

test("catálogo vacío conserva ceros y no crea pines ni categorías", () => {
  assert.deepEqual(summarizeCatalog([], []), {
    total: 0, active: 0, pending: 0, published: 0, unlocated: 0, distribution: [], points: [],
  });
});

test("categorías sobre todo el catálogo, ausencias explícitas y desempate por nombre", () => {
  const first = {category: "Cervecería", isActive: true, reviewStatus: "REVIEWED", publicationStatus: "PUBLISHED", _count: 1};
  const summary = summarizeCatalog([first, { ...first, category: "Bar", reviewStatus: "PENDING", publicationStatus:"DRAFT" },
    { ...first, category: null, isActive:false }, { ...first, category: "  " }], [{id:"a"}, {id:"b"}]);
  assert.deepEqual([summary.total, summary.active, summary.pending, summary.unlocated, summary.published], [4, 3, 1, 2, 3]);
  assert.deepEqual(summary.distribution, [
    { category: "Sin clasificar", count: 2, percent: 50 },
    { category: "Bar", count: 1, percent: 25 }, { category: "Cervecería", count: 1, percent: 25 },
  ]);
  assert.deepEqual(parseList({ ubicacion: "sin-pin", q: "Sur" }).where.AND, missingCoordinates);
  assert.equal(parseList({ ubicacion: "sin-pin" }, false).where.AND, undefined);
});

test("separa campos obligatorios, mejoras y coincidencias potenciales sin cambiar registros", () => {
  const venue = { ...complete, id: "b", normalizedName: "Otro nombre", sharedName: "Cervecería Sur", differentNames: true,
    address: null, location: "Lat: -26.8, Lon: -65.22", city: null, category: null, latitude: null, isPending: true };
  const before = { ...venue };
  const result = describePriority(venue);
  assert.equal(result.href, "/admin/locales/b");
  assert.deepEqual(result.required, ["Falta categoría", "Falta localidad", "Falta dirección verificable"]);
  assert.deepEqual(result.suggested, ["Falta ubicar el pin en el mapa"]);
  assert.equal(result.possible.length, 2);
  assert.match(result.possible[1], /Posible duplicado/);
  assert.deepEqual(venue, before);
});

test("una dirección sin altura requiere comprobación opcional", () => {
  const priority = describePriority({ ...complete, address: "Lamadrid", location: "", latitude: 0 });
  assert.deepEqual(priority.possible, []);
  assert.deepEqual(priority.required, []);
  assert.ok(priority.suggested.includes("Confirmar altura o referencia de la dirección"));
});

test("el historial distingue ausencia de éxitos, ventana de fallos y último error con mensaje", async () => {
  const now = new Date("2026-11-18T13:00:00Z");
  const queries = [];
  const success = { startedAt: new Date(0), finishedAt: new Date(1) };
  const error = { startedAt: new Date(2), errorMessage: "HTTP 502" };
  const db = {
    syncRun: {
      findMany(query) { queries.push(query); return []; },
      findFirst(query) { queries.push(query); return query.where.status === "SUCCESS" ? success : error; },
      count(query) { queries.push(query); return 2; },
    },
    $transaction: queries => Promise.all(queries),
  };
  assert.deepEqual(await readSyncSummary(db, now), { activity: [], lastSuccess: success.finishedAt, failures: 2, lastError: error });
  assert.deepEqual(queries[0].orderBy, [{startedAt: "desc"}, {id: "desc"}]);
  assert.equal(queries[0].take, 3);
  assert.deepEqual(queries[2].where, {status: "FAILED", startedAt: {gte: new Date("2026-11-11T13:00:00Z"), lte: now}});
  assert.equal(queries[3].where.status, "FAILED");
  db.syncRun.findFirst = () => null;
  db.syncRun.count = () => 0;
  assert.deepEqual(await readSyncSummary(db, now), { activity: [], lastSuccess: null, failures: 0, lastError: null });
});
