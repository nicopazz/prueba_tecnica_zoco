import assert from "node:assert/strict";
import test from "node:test";

const origin = "http://localhost:3000";
const basic = "Basic " + Buffer.from(process.env.ADMIN_USERNAME + ":" + process.env.ADMIN_PASSWORD).toString("base64");
const request = async (path, method = "GET", body, token = basic) => {
  const headers = {};
  if (token) headers.Authorization = token;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(origin + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* HTML */ }
  return { status: response.status, data, body: text };
};

test("web pública sin autenticación y administración protegida", async () => {
  assert.equal((await request("/", "GET", undefined, null)).status, 200);
  assert.equal((await request("/explorar", "GET", undefined, null)).status, 200);
  assert.equal((await request("/mapa", "GET", undefined, null)).status, 200);
  assert.equal((await request("/fuentes", "GET", undefined, null)).status, 200);
  assert.equal((await request("/admin", "GET", undefined, null)).status, 401);
  assert.equal((await request("/admin/locales", "GET", undefined, null)).status, 401);
  assert.equal((await request("/api/admin/venues/falso", "PATCH", {}, null)).status, 401);
  assert.equal((await request("/api/public/venues", "GET", undefined, null)).status, 200);
});

test("los locales no se publican por defecto y requieren revisión", async () => {
  const name = "Salimo QA " + Date.now();
  const created = await request("/api/venues", "POST", { normalizedName: name, location: "San Martín 123", category: "Bar" });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const id = created.data.data.id;
  const apiUrl = "/api/admin/venues/" + id;
  try {
    const draft = await request("/api/public/venues?q=" + encodeURIComponent(name), "GET", undefined, null);
    assert.equal(draft.data.count, 0);

    const premature = await request(apiUrl, "PATCH", { publicationStatus: "PUBLISHED" });
    assert.equal(premature.status, 400);

    const published = await request(apiUrl, "PATCH", {
      city: "San Miguel de Tucumán", address: "San Martín 123",
      reviewStatus: "REVIEWED", publicationStatus: "PUBLISHED",
      latitude: -26.824, longitude: -65.222,
    });
    assert.equal(published.status, 200, JSON.stringify(published.data));
    const slug = published.data.data.slug;
    assert.ok(slug);

    const listing = await request("/api/public/venues?q=" + encodeURIComponent(name), "GET", undefined, null);
    assert.equal(listing.status, 200);
    assert.equal(listing.data.count, 1);
    assert.equal(listing.data.venues[0].slug, slug);
    assert.equal((await request("/lugares/" + slug, "GET", undefined, null)).status, 200);

    const hidden = await request(apiUrl, "PATCH", { publicationStatus: "HIDDEN" });
    assert.equal(hidden.status, 200);
    const afterHide = await request("/api/public/venues?q=" + encodeURIComponent(name), "GET", undefined, null);
    assert.equal(afterHide.data.count, 0);
  } finally {
    const archived = await request("/api/venues/" + id, "DELETE");
    assert.equal(archived.status, 200);
  }
});
