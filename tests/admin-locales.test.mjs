import assert from "node:assert/strict";
import test from "node:test";
import { listHref, orders, pageBounds, parseList } from "../app/admin/locales/list-query.ts";

test("defaults and invalid or repeated URL parameters", () => {
  for (const raw of [{}, { pagina: "-2", tamano: "10000", orden: "id", q: ["a","b"], revision: "inventado" }]) {
    const q = parseList(raw);
    assert.equal(q.page, 1);
    assert.equal(q.size, 10);
    assert.deepEqual(q.where, {});
    assert.deepEqual(q.orderBy, [{updatedAt: "desc"}, {id: "desc"}]);
  }
});

test("same combined predicate for the count and page query, literal case-insensitive search", () => {
  const raw = { q: "  20%_  ", localidad: "Yerba Buena", categoria: "Pub", actividad: "inactivo",
    revision: "REVIEWED", publicacion: "HIDDEN", tamano: "25", orden: "nombre-asc", pagina: "2" };
  const q = parseList(raw);
  const match = { contains: "20\\%\\_", mode: "insensitive" };
  assert.deepEqual(q.where, { city:"Yerba Buena", category:"Pub", isActive:false, reviewStatus:"REVIEWED",
    publicationStatus:"HIDDEN", OR:["originalName","normalizedName","location","address"].map(key => ({[key]:match})) });
  const url = new URL(listHref(q, 3), "http://localhost");
  assert.deepEqual(parseList(Object.fromEntries(url.searchParams)), {...q, page:3});
  assert.equal(listHref(q, 1, true), "/admin/locales?orden=nombre-asc&tamano=25");
});

test("legacy schema and bounded search", () => {
  const q = parseList({localidad:"Yerba Buena", publicacion:"HIDDEN", q:"x".repeat(300)}, false);
  assert.equal(q.q.length, 100);
  assert.equal(q.where.OR.length, 3);
  assert.deepEqual(q.active, {});
});

test("allowed sort orders and stable tie breaker", () => {
  for (const [orden,, field, direction] of orders) {
    assert.deepEqual(parseList({orden}).orderBy, [{[field]:direction}, {id:direction}]);
  }
});

test("first, last, empty and out of range with all sizes", () => {
  for (const size of [10,25,50]) {
    assert.equal(parseList({tamano:String(size)}).size, size);
    assert.deepEqual(pageBounds(1,size,0), {page:1,pages:1,skip:0});
    assert.deepEqual(pageBounds(1,size,size+1), {page:1,pages:2,skip:0});
    assert.deepEqual(pageBounds(99,size,size+1), {page:2,pages:2,skip:size});
  }
});
