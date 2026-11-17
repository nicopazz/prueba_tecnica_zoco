import assert from "node:assert/strict";
import test from "node:test";
import { isWithinSalimoArea } from "../lib/venue-coordinates.ts";

test("acepta coordenadas geográficas plausibles de Tucumán", () => {
  assert.equal(isWithinSalimoArea(-26.824, -65.222), true);
  assert.equal(isWithinSalimoArea(-26.8168574, -65.274477), true);
});
test("rechaza coordenadas incorrectas sin inventar ubicación", () => {
  for (const pair of [[10, 3], [null, null], [-26.824, null], [NaN, -65.22], [0, 0], [-34.6, -58.4]]) {
    assert.equal(isWithinSalimoArea(pair[0], pair[1]), false);
  }
});
