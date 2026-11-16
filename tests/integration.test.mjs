import assert from "node:assert/strict";
import test from "node:test";

const origin = "http://localhost:3000";
const admin = "Basic " + Buffer.from(
  process.env.ADMIN_USERNAME + ":" + process.env.ADMIN_PASSWORD
).toString("base64");

async function send(path, method = "GET", body, authorization = admin, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (authorization) headers.Authorization = authorization;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(origin + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}

test("CRUD protege autenticación y valida datos con PostgreSQL real", async () => {
  const unauth = await send("/api/venues", "POST", { normalizedName: "Falso" }, null);
  assert.equal(unauth.status, 401);
  const crossSite = await send("/api/venues", "POST",
    { normalizedName: "Falso", location: "Centro", category: "Bar" },
    admin, { Origin: "https://malicioso.example.org" });
  assert.equal(crossSite.status, 403);

  const invalid = await send("/api/venues", "POST", { normalizedName: "", location: "x", category: "Otro" });
  assert.equal(invalid.status, 400);

  const name = "Prueba QA " + Date.now();
  const venue = { normalizedName: name, location: "San Martín 500", category: "Bar" };
  const created = await send("/api/venues", "POST", venue);
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data?.success, true);
  const id = created.data?.data?.id;
  assert.equal(typeof id, "string");

  try {
    const dup = await send("/api/venues", "POST", { ...venue, normalizedName: name.toUpperCase() });
    assert.equal(dup.status, 409);

    const wrongState = await send("/api/venues/" + id, "PATCH", { isActive: "false" });
    assert.equal(wrongState.status, 400);

    const patched = await send("/api/venues/" + id, "PATCH", { isActive: false, category: "Pub" });
    assert.equal(patched.status, 200, JSON.stringify(patched.data));
    assert.equal(patched.data.data.isActive, false);
    assert.equal(patched.data.data.category, "Pub");

    const missing = await send("/api/venues/nonexistent", "PATCH", { isActive: true });
    assert.equal(missing.status, 404);

    const adminSyncDenied = await send("/api/admin/sync", "POST", undefined, null);
    assert.equal(adminSyncDenied.status, 401);

    const syncDenied = await send("/api/sync", "POST", undefined, null);
    assert.equal(syncDenied.status, 401);

    const cronDenied = await send("/api/cron/sync", "GET", undefined, null);
    assert.equal(cronDenied.status, 401);
  } finally {
    const deleted = await send("/api/venues/" + id, "DELETE");
    assert.equal(deleted.status, 200);
  }
  const deletedAgain = await send("/api/venues/" + id, "DELETE");
  assert.equal(deletedAgain.status, 404);
});
