import assert from "node:assert/strict";
import test from "node:test";

// Explicitly read-only: runs against the local app without creating catalog data.
const origin = "http://localhost:3000";
async function html(path) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200, path);
  return response.text();
}

test("public routes share five-position mobile navigation and an accessible menu", async () => {
  for (const path of ["/", "/explorar", "/mapa", "/guia", "/fuentes"]) {
    const body = await html(path);
    const navigation = body.match(/<nav[^>]*aria-label="Navegación móvil"[\s\S]*?<\/nav>/)?.[0];
    assert.ok(navigation, path);
    assert.equal((navigation.match(/<a\s/g) || []).length, 4, path);
    assert.equal((navigation.match(/<button\s/g) || []).length, 1, path);
    assert.match(navigation, /Favoritos: próximamente/);
    assert.match(body, /aria-controls="public-mobile-menu"/);
  }
});

test("search and map filters preserve real public GET routes", async () => {
  const home = await html("/");
  assert.match(home, /action="\/explorar"/);
  assert.match(home, /name="q"/);
  assert.match(home, /Filtrar mapa por tipo/);
  assert.match(home, /OpenStreetMap/);
  for (const route of ["/explorar", "/mapa"]) {
    const filtered = await html(route + "?q=salimo-no-result-qa&category=Pub&city=Yerba%20Buena");
    assert.match(filtered, /id="filtros"/);
    assert.match(filtered, /salimo-no-result-qa/);
  }
});

test("real published venue details retain navigation; guide links to sources", async () => {
  const response = await fetch(origin + "/api/public/venues");
  assert.equal(response.status, 200);
  const { venues } = await response.json();
  if (venues[0]) {
    const detail = await html("/lugares/" + venues[0].slug);
    assert.match(detail, /aria-label="Navegación móvil"/);
    assert.match(detail, /<a(?=[^>]*href="\/explorar")(?=[^>]*aria-current="page")[^>]*>/);
  }
  assert.match(await html("/guia"), /href="\/fuentes"/);
});

test("admin stays protected and does not render public mobile navigation", async () => {
  const response = await fetch(origin + "/admin");
  assert.equal(response.status, 401);
  assert.doesNotMatch(await response.text(), /Navegación móvil/);
});
