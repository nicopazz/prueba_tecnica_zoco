import assert from "node:assert/strict";
import test from "node:test";
import { collectionHref, pageBounds, parsePagination } from "../app/admin/locales/list-query.ts";
import { reviewState, reviewTotals } from "../app/admin/revision/review-filters.ts";
import { runFilters } from "../app/admin/sincronizaciones/run-filters.ts";

test("los totales de revisión cuentan las tres bandejas independientemente del filtro", () => {
  const groups = [
    { reviewStatus: "PENDING", publicationStatus: "DRAFT", _count: 12 },
    { reviewStatus: "REVIEWED", publicationStatus: "HIDDEN", _count: 2 },
    { reviewStatus: "REVIEWED", publicationStatus: "DRAFT", _count: 3 },
    { reviewStatus: "REVIEWED", publicationStatus: "PUBLISHED", _count: 4 },
    { reviewStatus: "PENDING", publicationStatus: "PUBLISHED", _count: 1 },
  ];
  assert.deepEqual(reviewTotals(groups), { pendientes: 13, revisados: 5, publicados: 5, todos: 22 });
  assert.equal(reviewState("todos"), "todos");
  for (const invalid of [undefined, "constructor", ["revisados"], "PUBLISHED"]) assert.equal(reviewState(invalid), "pendientes");
});

test("el historial combina estado, origen y días completos en horario de Tucumán", () => {
  const f = runFilters({ estado: "FAILED", origen: "MANUAL", desde: "2024-02-29", hasta: "2024-02-29" }, ["MANUAL"]);
  assert.equal(f.error, "");
  assert.deepEqual(f.where, { status: "FAILED", triggeredBy: "MANUAL", startedAt: {
    gte: new Date("2024-02-29T03:00:00Z"), lt: new Date("2024-03-01T03:00:00Z"),
  } });
});

test("rechaza fechas imposibles y rangos invertidos y limita los filtros a opciones válidas", () => {
  for (const raw of [{ desde: "2025-02-29" }, { hasta: ["2026-01-01"] }, { desde: "2026-04-16", hasta: "2026-04-15" }]) {
    assert.ok(runFilters(raw, []).error);
  }
  assert.deepEqual(runFilters({ estado: "constructor", origen: "OTRO" }, ["MANUAL"]).where, {});
  assert.deepEqual(runFilters({ desde: "2026-01-01" }, []).where.startedAt, {gte: new Date("2026-01-01T03:00:00Z")});
});

test("las dos rutas conservan sus parámetros al paginar y limpiar conserva el orden y el tamaño", () => {
  for (const [path, active, order, defaultOrder, q] of [
    ["/admin/revision", { estado: "revisados" }, "nombre-asc", "modificacion-desc", "bar"],
    ["/admin/sincronizaciones", { estado: "FAILED", origen: "CRON", desde: "2026-01-01" }, "asc", "desc", undefined],
  ]) {
    const view = { ...parsePagination({ tamano: "25" }), active, order, q };
    const url = new URL(collectionHref(path, defaultOrder, view, 2), "http://localhost");
    assert.equal(url.pathname, path);
    assert.deepEqual(Object.fromEntries(url.searchParams), { ...active, ...(q ? {q} : {}), orden: order, tamano: "25", pagina: "2" });
    assert.deepEqual(pageBounds(2, 25, 26), { page: 2, pages: 2, skip: 25 });
    assert.equal(collectionHref(path, defaultOrder, view, 1, true), path + "?orden=" + order + "&tamano=25");
  }
});
