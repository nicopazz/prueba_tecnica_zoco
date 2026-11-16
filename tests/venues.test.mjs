import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCreateVenue,
  validatePatchVenue,
  isPrismaError,
} from "../lib/venue-validation.ts";

const valid = { normalizedName: "Bar del Norte", location: "San Martín 500", category: "Bar" };

test("crea un local con entrada válida y limpia espacios", () => {
  const result = validateCreateVenue({ ...valid, normalizedName: "  Bar  del Norte  " });
  assert.equal(result.success, true);
  assert.equal(result.data?.normalizedName, "Bar del Norte");
});

test("rechaza body inválido, ausente y JSON no objeto", () => {
  for (const value of [null, [], "cadena", { location: "Centro", category: "Bar" }]) {
    assert.equal(validateCreateVenue(value).success, false);
  }
});

test("no acepta nombres o ubicaciones vacías, largas ni controles", () => {
  for (const value of ["", " ", "a", "a".repeat(161), "Bar\nX", 5]) {
    assert.equal(validateCreateVenue({ ...valid, normalizedName: value }).success, false);
  }
  for (const value of ["", "a", 123, "a".repeat(251)]) {
    assert.equal(validateCreateVenue({ ...valid, location: value }).success, false);
  }
});

test("no acepta categorías incorrectas ni campos extra", () => {
  assert.equal(validateCreateVenue({ ...valid, category: "Restaurante" }).success, false);
  assert.equal(validateCreateVenue({ ...valid, isAdmin: true }).success, false);
});

test("PATCH permite booleanos y cambios parciales", () => {
  assert.deepEqual(validatePatchVenue({ isActive: false }), { success: true, data: { isActive: false } });
  assert.equal(validatePatchVenue({ category: "Pub" }).success, true);
  assert.equal(validatePatchVenue({ normalizedName: "  Bar Sur  " }).success, true);
});

test("PATCH rechaza modificaciones inválidas", () => {
  for (const value of [{}, [], null, { isActive: "false" }, { normalizedName: null }, { source: "Manual" }, { location: "" }]) {
    assert.equal(validatePatchVenue(value).success, false);
  }
});

test("clasifica códigos conocidos de errores de Prisma", () => {
  assert.equal(isPrismaError({ code: "P2002" }, "P2002"), true);
  assert.equal(isPrismaError({ code: "P2025" }, "P2002"), false);
  assert.equal(isPrismaError(null, "P2002"), false);
});
