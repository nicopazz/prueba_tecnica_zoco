import type { RawVenue } from "./overpass";

type Category = "Bar" | "Pub" | "Cervecería" | "Boliche";
export type ClassifiedVenue = Omit<RawVenue, "category"> & { category: Category; normalizedName: string; confidence: number };
const allowed = new Set<string>(["Bar", "Pub", "Cervecería", "Boliche"]);

function baseline(row: RawVenue): ClassifiedVenue {
  return { ...row, normalizedName: row.originalName, confidence: 50 };
}
export function applyAiSuggestions(rows: RawVenue[], payload: unknown): ClassifiedVenue[] {
  const output = new Map(rows.map(row => [row.osmKey, baseline(row)]));
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [...output.values()];
  const suggestions = (payload as { venues?: unknown }).venues;
  if (!Array.isArray(suggestions)) return [...output.values()];
  const seen = new Set<string>();

  for (const candidate of suggestions) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const row = candidate as Record<string, unknown>;
    if (typeof row.osmKey !== "string" || seen.has(row.osmKey)) continue;
    const original = output.get(row.osmKey);
    if (!original) continue;
    seen.add(row.osmKey);
    const name = typeof row.normalizedName === "string" ? row.normalizedName.trim().replace(/\s+/g, " ") : "";
    if (name.length < 2 || name.length > 160 || /[\u0000-\u001F\u007F]/u.test(name)) continue;
    if (typeof row.confidence !== "number" || !Number.isFinite(row.confidence) ||
        row.confidence < 0 || row.confidence > 100 ||
        typeof row.category !== "string" || !allowed.has(row.category)) continue;
    output.set(row.osmKey, {
      ...original, normalizedName: name, category: row.category as Category,
      confidence: Math.round(row.confidence),
    });
  }
  return [...output.values()];
}

async function classifyBatch(rows: RawVenue[], apiKey: string): Promise<ClassifiedVenue[]> {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  if (!/^gemini-[a-z0-9.-]+$/.test(model)) throw new Error("Modelo Gemini no permitido.");
  const prompt = [
    "Normalizá nombres de bares y pubs de Tucumán. No inventes locales.",
    'Devolvé solamente JSON: {"venues":[{"osmKey":"...","normalizedName":"...","category":"Bar|Pub|Cervecería|Boliche","confidence":85}]}.',
    "No cambies los IDs osmKey. Datos:", JSON.stringify(rows),
  ].join("\n");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Gemini respondió HTTP " + response.status);
  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("");
  if (!text || text.length > 50000) throw new Error("Respuesta IA inválida o vacía.");
  return applyAiSuggestions(rows, JSON.parse(text) as unknown);
}

export async function classifyNewVenues(rows: RawVenue[]): Promise<{
  venues: ClassifiedVenue[]; usedAi: boolean; warnings: string[];
}> {
  const key = process.env.GEMINI_API_KEY;
  const warnings: string[] = [];
  if (!key || rows.length === 0) {
    if (!key && rows.length) warnings.push("Gemini no configurado: se aplicaron reglas básicas.");
    return { venues: rows.map(baseline), usedAi: false, warnings };
  }
  const venues: ClassifiedVenue[] = [];
  let usedAi = false;
  for (let i = 0; i < rows.length; i += 25) {
    const batch = rows.slice(i, i + 25);
    try {
      venues.push(...await classifyBatch(batch, key));
      usedAi = true;
    } catch (error) {
      console.warn("Gemini: fallback aplicado.", error instanceof Error ? error.message : "Respuesta inválida");
      warnings.push("Gemini falló en un lote; se usaron reglas básicas.");
      venues.push(...batch.map(baseline));
    }
  }
  return { venues, usedAi, warnings };
}
