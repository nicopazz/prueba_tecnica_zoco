import assert from "node:assert/strict";
import test from "node:test";
import {
  verifyAdminAuthorization,
  verifySyncAuthorization,
  isUnsafeCrossOrigin,
} from "../lib/security.ts";

test("deniega acceso administrativo sin credenciales configuradas", () => {
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
  assert.equal(verifyAdminAuthorization("Basic YWRtaW46cGFzcw=="), false);
});

test("solo acepta credenciales administrativas correctas", () => {
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "secreto_de_prueba";
  const basic = (value) => "Basic " + Buffer.from(value).toString("base64");
  assert.equal(verifyAdminAuthorization(basic("admin:secreto_de_prueba")), true);
  assert.equal(verifyAdminAuthorization(basic("admin:incorrecto")), false);
  assert.equal(verifyAdminAuthorization("Bearer token"), false);
});

test("la sincronización exige token de servicio", () => {
  process.env.SYNC_API_TOKEN = "token_largo_de_prueba";
  assert.equal(verifySyncAuthorization("Bearer token_largo_de_prueba"), true);
  assert.equal(verifySyncAuthorization("Bearer falso"), false);
  assert.equal(verifySyncAuthorization(null), false);
  delete process.env.SYNC_API_TOKEN;
  assert.equal(verifySyncAuthorization("Bearer token_largo_de_prueba"), false);
});

test("rechaza mutaciones originadas desde otro sitio", () => {
  const url = "https://locales.example.com/api/venues";
  assert.equal(isUnsafeCrossOrigin(new Request(url, {
    method: "POST", headers: { origin: "https://locales.example.com", "sec-fetch-site": "same-origin" },
  })), false);
  assert.equal(isUnsafeCrossOrigin(new Request(url, {
    method: "POST", headers: { origin: "https://evil.example.com", "sec-fetch-site": "same-site" },
  })), true);
  assert.equal(isUnsafeCrossOrigin(new Request(url, {
    method: "DELETE", headers: { origin: "https://otro.example.org" },
  })), true);
});
