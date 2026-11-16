export type VenueInput = {
  normalizedName: string;
  location: string;
  category: "Bar" | "Pub" | "Cervecería" | "Boliche";
};

export type VenuePatch = Partial<VenueInput> & { isActive?: boolean };

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const allowedCategories = new Set<string>(["Bar", "Pub", "Cervecería", "Boliche"]);
const createFields = new Set(["normalizedName", "location", "category"]);
const updateFields = new Set(["normalizedName", "location", "category", "isActive"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateFields(value: unknown, allowed: Set<string>): Result<Record<string, unknown>> {
  if (!isObject(value)) return { success: false, error: "Se espera un objeto JSON." };
  if (Object.keys(value).some((field) => !allowed.has(field))) {
    return { success: false, error: "La solicitud contiene campos no permitidos." };
  }
  return { success: true, data: value };
}

function normalizeText(value: unknown, field: string, min: number, max: number): Result<string> {
  if (typeof value !== "string") {
    return { success: false, error: field + " debe ser un texto." };
  }
  const text = value.trim().replace(/ {2,}/g, " ");
  if (text.length < min || text.length > max || /[\u0000-\u001F\u007F]/u.test(text)) {
    return { success: false, error: field + " debe contener entre " + min + " y " + max + " caracteres válidos." };
  }
  return { success: true, data: text };
}

function validateCategory(value: unknown): Result<VenueInput["category"]> {
  if (typeof value !== "string" || !allowedCategories.has(value)) {
    return { success: false, error: "Categoría inválida. Elegí Bar, Pub, Cervecería o Boliche." };
  }
  return { success: true, data: value as VenueInput["category"] };
}

export function validateCreateVenue(value: unknown): Result<VenueInput> {
  const obj = validateFields(value, createFields);
  if (!obj.success) return obj;
  const name = normalizeText(obj.data.normalizedName, "El nombre", 2, 160);
  if (!name.success) return name;
  const location = normalizeText(obj.data.location, "La ubicación", 3, 250);
  if (!location.success) return location;
  const category = validateCategory(obj.data.category);
  if (!category.success) return category;

  return {
    success: true,
    data: { normalizedName: name.data, location: location.data, category: category.data },
  };
}

export function validatePatchVenue(value: unknown): Result<VenuePatch> {
  const obj = validateFields(value, updateFields);
  if (!obj.success) return obj;
  if (Object.keys(obj.data).length === 0) {
    return { success: false, error: "Indicá al menos un campo para actualizar." };
  }
  const data: VenuePatch = {};

  if ("normalizedName" in obj.data) {
    const parsed = normalizeText(obj.data.normalizedName, "El nombre", 2, 160);
    if (!parsed.success) return parsed;
    data.normalizedName = parsed.data;
  }
  if ("location" in obj.data) {
    const parsed = normalizeText(obj.data.location, "La ubicación", 3, 250);
    if (!parsed.success) return parsed;
    data.location = parsed.data;
  }
  if ("category" in obj.data) {
    const parsed = validateCategory(obj.data.category);
    if (!parsed.success) return parsed;
    data.category = parsed.data;
  }
  if ("isActive" in obj.data) {
    if (typeof obj.data.isActive !== "boolean") {
      return { success: false, error: "El estado activo debe ser verdadero o falso." };
    }
    data.isActive = obj.data.isActive;
  }
  return { success: true, data };
}

export function isPrismaError(error: unknown, code: string): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === code;
}
