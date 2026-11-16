import assert from "node:assert/strict";
import test from "node:test";
import { parseOverpass } from "../services/overpass.ts";
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
