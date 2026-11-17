import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Los hashes oficiales de Leaflet 1.9.4 impiden servir CSS/JS alterados.
// Si difieren, el navegador rechaza el archivo y el mapa queda descompuesto.
const mapSource = readFileSync(new URL("../app/components/PublicMap.tsx", import.meta.url), "utf8");

test("Leaflet 1.9.4 incluye el CSS con integridad oficial", () => {
  assert.match(mapSource, /https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.css/);
  assert.ok(mapSource.includes("sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="));
});

test("Leaflet 1.9.4 incluye el JavaScript con integridad oficial", () => {
  assert.match(mapSource, /https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js/);
  assert.ok(mapSource.includes("sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="));
});
