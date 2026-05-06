import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

// contacto para User-Agent si Overpass lo requiere
const contact = process.env.OVERPASS_CONTACT || "soporte@miapp.com";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// inicializo Prisma y cliente de Gemini
const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

type OSMElement = { tags?: Record<string, string>; lat: number; lon: number };

// intenta elegir un modelo Gemini que soporte generateContent
async function chooseGeminiModel() {
  try {
    const list = await genAI.listModels();
    const models = (list?.models || []) as Array<{ name?: string; supportedMethods?: string[] }>;

    // orden de preferencia
    const preferred = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-latest"];

    // busco un modelo preferido que soporte generateContent
    for (const p of preferred) {
      const found = models.find(
        (m) => m.name === p && Array.isArray(m.supportedMethods) && m.supportedMethods.includes("generateContent")
      );
      if (found?.name) return found.name;
    }

    // si no hay preferidos, tomo el primer "gemini" que soporte generateContent
    const fallback = models.find((m) => Array.isArray(m.supportedMethods) && m.supportedMethods.includes("generateContent") && m.name?.includes("gemini"));
    if (fallback?.name) return fallback.name;

    // si no hay ninguno adecuado, devuelvo undefined
    return undefined;
  } catch (err) {
    console.error("Error listModels:", err);
    return undefined;
  }
}

export async function GET() {
  console.log("Iniciando sincronización con Overpass API...");

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="bar"](-26.85, -65.30, -26.75, -65.15);
      node["amenity"="pub"](-26.85, -65.30, -26.75, -65.15);
    );
    out body 15;
  `;

  try {
    // llamo a Overpass
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "User-Agent": `MiApp/1.0 (${contact})`,
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams({ data: query }).toString(),
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      // si Overpass falla, devuelvo 502
      console.error("Overpass no OK:", response.status, text);
      return NextResponse.json({ success: false, error: "Fallo Overpass" }, { status: 502 });
    }

    const data = JSON.parse(text);

    // extraigo solo elementos con nombre
    const rawVenues = (data.elements || [])
      .filter((el: OSMElement) => el.tags && el.tags.name)
      .map((el: OSMElement) => ({
        originalName: el.tags!.name,
        location: el.tags!["addr:street"]
          ? `${el.tags!["addr:street"]} ${el.tags!["addr:housenumber"] || ""}`.trim()
          : `Lat: ${el.lat}, Lon: ${el.lon}`,
        source: "Overpass API",
      }));

    if (rawVenues.length === 0) {
      // nada que procesar
      return NextResponse.json({ success: true, message: "No se encontraron datos." });
    }

    // preparo prompt para la IA
    console.log(`Enviando ${rawVenues.length} lugares a Gemini para limpieza...`);
    const prompt = `
Eres un experto en limpieza de datos. Recibirás una lista de bares en formato JSON.
Devuelve un JSON estricto con la clave "venues", que sea un array de objetos.
Para cada objeto, genera:
- "originalName": El nombre exacto que recibiste.
- "normalizedName": El nombre corregido (arregla mayúsculas, elimina palabras genéricas redundantes como "bar", "pub", "tucuman" si ensucian el nombre).
- "category": Clasifícalo estrictamente en "Bar", "Pub", "Cervecería" o "Boliche".
- "location": La misma que recibiste.
- "confidence": Un número del 1 al 100 indicando qué tan seguro estás de la normalización.

Datos crudos: ${JSON.stringify(rawVenues)}
`.trim();

    // elijo un modelo válido
    const chosenModelName = await chooseGeminiModel();
    if (!chosenModelName) {
      console.warn("No se encontró un modelo Gemini compatible con generateContent. Se usará fallback sin IA.");
    }

    let processedVenues: any[] = [];

    if (chosenModelName) {
      try {
        // obtengo el modelo y pido generación
        const model = genAI.getGenerativeModel({
          model: chosenModelName,
          generationConfig: { responseMimeType: "application/json" },
        });

        const aiResponse = await model.generateContent(prompt);

        // la SDK puede devolver text como función o string; manejo ambos casos
        let aiContent: string | undefined;
        try {
          const maybeText = aiResponse?.response?.text;
          aiContent = typeof maybeText === "function" ? await maybeText() : maybeText;
        } catch (innerErr) {
          console.warn("No se pudo obtener text() de aiResponse.response, intentando stringify:", innerErr);
          aiContent = JSON.stringify(aiResponse?.response || "");
        }

        // intento parsear JSON estricto
        try {
          const parsed = JSON.parse(aiContent || '{"venues":[]}');
          processedVenues = Array.isArray(parsed.venues) ? parsed.venues : [];
        } catch (parseErr) {
          console.error("Error parseando respuesta de Gemini como JSON:", parseErr, aiContent);
          processedVenues = [];
        }
      } catch (aiError) {
        // si Gemini falla, lo registro y sigo con fallback
        console.error("Error con Gemini:", aiError);
        processedVenues = [];
      }
    }

    // fallback si no hay respuesta válida de la IA
    if (!processedVenues || processedVenues.length === 0) {
      console.log("Usando fallback: normalización básica sin IA.");
      processedVenues = rawVenues.map((v) => ({
        originalName: v.originalName,
        normalizedName: v.originalName.replace(/\b(bar|pub|cerveceria|cervecería|tucuman)\b/gi, "").trim() || v.originalName,
        category: "Bar",
        location: v.location,
        confidence: 50,
      }));
    }

    // guardo en la DB evitando duplicados con upsert
    console.log("Guardando en la base de datos PostgreSQL...");
    let savedCount = 0;

    for (const venue of processedVenues) {
      try {
        await prisma.venue.upsert({
          where: {
            normalizedName_location: {
              normalizedName: venue.normalizedName,
              location: venue.location,
            },
          },
          update: {
            originalName: venue.originalName,
            category: venue.category,
            updatedAt: new Date(),
            confidence: venue.confidence ?? null,
          },
          create: {
            originalName: venue.originalName,
            normalizedName: venue.normalizedName,
            location: venue.location,
            category: venue.category,
            source: "Overpass API",
            confidence: venue.confidence ?? null,
            isActive: true,
          },
        });
        savedCount++;
      } catch (dbError) {
        // si falla un registro, lo logueo y sigo con los demás
        console.error(`Error guardando ${venue.normalizedName || venue.originalName}:`, dbError);
      }
    }

    // devuelvo resultado
    return NextResponse.json({
      success: true,
      message: `Sincronización completa. ${savedCount} registros procesados y guardados.`,
      data: processedVenues,
    });
  } catch (error) {
    // error general del endpoint
    console.error("Error general:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  } finally {
    // desconecto Prisma por si acaso (evita conexiones abiertas en serverless)
    try {
      await prisma.$disconnect();
    } catch (e) {
      // no hago nada si falla el disconnect
    }
  }
}
