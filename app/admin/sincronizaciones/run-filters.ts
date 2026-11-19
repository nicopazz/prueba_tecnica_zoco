import type { Prisma } from "@prisma/client";
import type { Params } from "../locales/list-query";

export const statusLabels: Record<string, string> = {
  SUCCESS: "Completada", FAILED: "Fallida", RUNNING: "En curso",
};
export const triggerLabels: Record<string, string> = {
  MANUAL: "Manual", CRON: "Programada", TOKEN: "Servicio", AUDIT_LOCAL: "Auditoría local",
};

function localDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const start = new Date(value + "T00:00:00-03:00");
  return Number.isFinite(start.getTime()) && start.toISOString().slice(0, 10) === value ? start : null;
}

export function runFilters(raw: Params, origins: string[]) {
  const where: Prisma.SyncRunWhereInput = {};
  const active: Record<string, string> = {};
  if (typeof raw.estado === "string" && Object.hasOwn(statusLabels, raw.estado)) {
    active.estado = where.status = raw.estado;
  }
  if (typeof raw.origen === "string" && origins.includes(raw.origen)) {
    active.origen = where.triggeredBy = raw.origen;
  }
  let error = "";
  const interval: { gte?: Date; lt?: Date } = {};
  for (const key of ["desde", "hasta"] as const) {
    const value = raw[key];
    if (!value) continue;
    const date = typeof value === "string" ? localDate(value) : null;
    if (!date || typeof value !== "string") {
      error = "Ingresá fechas válidas para consultar el historial.";
      continue;
    }
    active[key] = value;
    if (key === "desde") interval.gte = date;
    else interval.lt = new Date(date.getTime() + 86_400_000);
  }
  if (interval.gte && interval.lt && interval.gte >= interval.lt) {
    error = "La fecha final debe ser igual o posterior a la inicial.";
  }
  if (interval.gte || interval.lt) where.startedAt = interval;
  return { active, where, error };
}
