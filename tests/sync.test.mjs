import assert from "node:assert/strict";
import test from "node:test";
import { parseOverpass, fetchOverpass, OverpassServiceError } from "../services/overpass.ts";
import { applyAiSuggestions } from "../services/ai.ts";

const sample = {
  elements: [
    { type: "node", id: 42, lat: -26.8, lon: -65.2, tags: { amenity: "bar", name: "  Norte  Bar " } },
    { type: "way", id: 51, center: { lat: -26.81, lon: -65.22 },
      tags: { amenity: "pub", name: "Sur Pub", "addr:street": "San Martín", "addr:housenumber": "100" } },
    { type: "relation", id: 52, center: { lat: -26.82, lon: -65.2 },
      tags: { amenity: "bar", name: "De la plaza" } },
  ],
};

test("importa nodos, vías y relaciones con identificador OSM estable", () => {
  const rows = parseOverpass(sample);
  assert.deepEqual(rows.map(x => x.osmKey), ["osm:node:42", "osm:relation:52", "osm:way:51"]);
  assert.equal(rows[0].originalName, "Norte Bar");
  assert.equal(rows.find(x => x.osmKey === "osm:way:51").location, "San Martín 100");
});

test("evita duplicados en la misma respuesta", () => {
  assert.equal(parseOverpass({ elements: [...sample.elements, sample.elements[0]] }).length, 3);
});

test("rechaza registros sin ubicación, nombre o categoría válida", () => {
  const rows = parseOverpass({ elements: [
    { type: "node", id: 1, tags: { amenity: "bar", name: "SIN UBICACIÓN" } },
    { type: "node", id: 2, lat: 200, lon: 0, tags: { amenity: "bar", name: "FUERA" } },
    { type: "node", id: 3, lat: -26, lon: -65, tags: { amenity: "restaurant", name: "RESTO" } },
    { type: "node", id: 4, lat: -26, lon: -65, tags: { amenity: "bar", name: "" } },
  ] });
  assert.equal(rows.length, 0);
});

test("rechaza respuestas Overpass mal formadas", () => {
  for (const value of [null, {}, { elements: "incorrecto" }, []]) {
    assert.throws(() => parseOverpass(value));
  }
});

test("la IA no puede inventar establecimientos", () => {
  const rows = parseOverpass(sample);
  const result = applyAiSuggestions(rows, { venues: [
    { osmKey: "osm:node:42", normalizedName: "Norte", category: "Bar", confidence: 95 },
    { osmKey: "osm:node:1000", normalizedName: "INVENTADO", category: "Pub", confidence: 100 },
  ] });
  assert.equal(result.length, rows.length);
  assert.equal(result.find(x => x.osmKey === "osm:node:42").normalizedName, "Norte");
  assert.ok(!result.some(x => x.normalizedName === "INVENTADO"));
});

test("IA inválida conserva todos los registros con fallback seguro", () => {
  const rows = parseOverpass(sample);
  const result = applyAiSuggestions(rows, { venues: [
    { osmKey: "osm:node:42", normalizedName: "", category: "Fake", confidence: 300 },
    { osmKey: "osm:node:42", normalizedName: "XX", category: "Bar", confidence: 60 },
  ] });
  assert.equal(result.length, rows.length);
  assert.equal(result.find(x => x.osmKey === "osm:node:42").normalizedName, "Norte Bar");
});

import { findUniqueLegacyMatch, sameLegacyPlace } from "../services/sync-matching.ts";

const previous = (patch = {}) => ({
  id: "legacy-a", originalName: "Heller",
  location: "Lat: -26.8168574, Lon: -65.274477",
  latitude: -26.8168574, longitude: -65.274477, address: null,
  ...patch,
});
const incoming = (patch = {}) => ({
  osmKey: "osm:node:5", originalName: "Heller",
  location: "Lat: -26.816860, Lon: -65.274480",
  latitude: -26.816860, longitude: -65.274480,
  city: null, address: null, category: "Bar",
  ...patch,
});

test("reutiliza el registro antiguo cuando coincide el nombre y el punto", () => {
  assert.equal(findUniqueLegacyMatch([previous()], incoming()), "legacy-a");
});
test("no confunde locales con el mismo nombre pero ubicaciones lejanas", () => {
  assert.equal(sameLegacyPlace(previous(), incoming({
    latitude: -26.83, longitude: -65.20,
  })), false);
});
test("si dos candidatos coinciden mantiene un conflicto para revisión", () => {
  assert.equal(findUniqueLegacyMatch([previous(), previous({id:"legacy-b"})], incoming()), null);
});
test("coincide por dirección completa sin coordenadas, nunca por calle sola", () => {
  const a = previous({ originalName: "Boho Bar", latitude:null, longitude:null, location:"Corrientes 121" });
  assert.equal(findUniqueLegacyMatch([a], incoming({
    originalName:"Boho Bar", address:"Corrientes 121", location:"Corrientes 121",
  })), "legacy-a");
  assert.equal(findUniqueLegacyMatch([a], incoming({
    originalName:"Boho Bar", address:"Corrientes", location:"Corrientes",
  })), null);
});
test("puede leer coordenadas heredadas como texto", () => {
  assert.equal(findUniqueLegacyMatch([previous({latitude:null,longitude:null})], incoming()), "legacy-a");
});
test("un nombre distinto no se vincula aunque las coordenadas sean iguales", () => {
  assert.equal(findUniqueLegacyMatch([previous({originalName:"Otro local"})], incoming()), null);
});

test("consulta el servidor alternativo cuando el primero devuelve HTTP 502", async () => {
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    if (calls.length === 1) return { ok: false, status: 502, headers: new Headers() };
    return { ok: true, status: 200, text: async () => JSON.stringify(sample) };
  };
  const venues = await fetchOverpass(fakeFetch);
  assert.equal(venues.length, 3);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes("overpass.private.coffee"));
  assert.ok(calls[1].includes("overpass-api.de"));
});

test("usa alternativa si un servidor supera el tiempo de respuesta", async () => {
  let attempted = 0;
  const fakeFetch = async () => {
    attempted++;
    if (attempted === 1) throw new DOMException("Timeout", "TimeoutError");
    return { ok: true, status: 200, text: async () => JSON.stringify(sample) };
  };
  const venues = await fetchOverpass(fakeFetch);
  assert.equal(venues.length, 3);
  assert.equal(attempted, 2);
});

test("la saturación simultánea informa error recuperable sin importar registros", async () => {
  let attempted = 0;
  const fakeFetch = async () => {
    attempted++;
    return { ok: false, status: 503, headers: new Headers() };
  };
  await assert.rejects(fetchOverpass(fakeFetch),
    error => error instanceof OverpassServiceError && error.reason === "UNAVAILABLE");
  assert.equal(attempted, 2);
});

test("no salta a otro servidor para evadir HTTP 429", async () => {
  let attempted = 0;
  const fakeFetch = async () => {
    attempted++;
    return { ok: false, status: 429, headers: new Headers({ "retry-after": "90" }) };
  };
  await assert.rejects(fetchOverpass(fakeFetch),
    error => error instanceof OverpassServiceError && error.reason === "RATE_LIMITED" && error.retryAfterSeconds === 90);
  assert.equal(attempted, 1);
});

test("si Overpass devuelve remark de timeout por HTTP 200, se usa el respaldo", async () => {
  let attempted = 0;
  const fakeFetch = async () => {
    attempted++;
    return { ok: true, status: 200, text: async () => JSON.stringify(attempted === 1 ? { remark: "runtime error: Query timed out" } : sample) };
  };
  const venues = await fetchOverpass(fakeFetch);
  assert.equal(venues.length, 3);
  assert.equal(attempted, 2);
});
