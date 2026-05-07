import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const contact = process.env.OVERPASS_CONTACT || "soporte@miapp.com";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

type OSMElement = {
  tags?: Record<string, string>;
  lat: number;
  lon: number;
};

type ProcessedVenue = {
  originalName: string;
  normalizedName: string;
  category: string;
  location: string;
  confidence: number | null;
};

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
      console.error("Overpass no OK:", response.status, text);

      return NextResponse.json(
        {
          success: false,
          error: "Fallo Overpass",
        },
        {
          status: 502,
        }
      );
    }

    const data = JSON.parse(text);

    const rawVenues = (data.elements || [])
      .filter((el: OSMElement) => el.tags && el.tags.name)
      .map((el: OSMElement) => ({
        originalName: el.tags!.name,
        location: el.tags!["addr:street"]
          ? `${el.tags!["addr:street"]} ${
              el.tags!["addr:housenumber"] || ""
            }`.trim()
          : `Lat: ${el.lat}, Lon: ${el.lon}`,
        source: "Overpass API",
      }));

    if (rawVenues.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No se encontraron datos.",
      });
    }

    console.log(
      `Enviando ${rawVenues.length} lugares a Gemini para limpieza...`
    );

    const prompt = `
Eres un experto en limpieza de datos. Recibirás una lista de bares en formato JSON.
Devuelve un JSON estricto con la clave "venues", que sea un array de objetos.
Para cada objeto, genera:
- "originalName": El nombre exacto que recibiste.
- "normalizedName": El nombre corregido.
- "category": Clasifícalo estrictamente en "Bar", "Pub", "Cervecería" o "Boliche".
- "location": La misma que recibiste.
- "confidence": Un número del 1 al 100 indicando qué tan seguro estás de la normalización.

Datos crudos: ${JSON.stringify(rawVenues)}
`.trim();

    let processedVenues: ProcessedVenue[] = [];

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const aiResponse = await model.generateContent(prompt);

      let aiContent = "";

      try {
        aiContent = await aiResponse.response.text();
      } catch {
        aiContent = JSON.stringify(aiResponse.response || "");
      }

      try {
        const parsed = JSON.parse(aiContent || '{"venues":[]}');

        processedVenues = Array.isArray(parsed.venues)
          ? parsed.venues
          : [];
      } catch (parseErr) {
        console.error(
          "Error parseando respuesta de Gemini:",
          parseErr
        );

        processedVenues = [];
      }
    } catch (aiError) {
      console.error("Error con Gemini:", aiError);

      processedVenues = [];
    }

    if (!processedVenues || processedVenues.length === 0) {
      console.log("Usando fallback: normalización básica sin IA.");

      processedVenues = rawVenues.map(
        (v: {
          originalName: string;
          location: string;
          source: string;
        }) => ({
          originalName: v.originalName,
          normalizedName:
            v.originalName
              .replace(
                /\b(bar|pub|cerveceria|cervecería|tucuman)\b/gi,
                ""
              )
              .trim() || v.originalName,
          category: "Bar",
          location: v.location,
          confidence: 50,
        })
      );
    }

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
        console.error(
          `Error guardando ${
            venue.normalizedName || venue.originalName
          }:`,
          dbError
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completa. ${savedCount} registros procesados y guardados.`,
      data: processedVenues,
    });
  } catch (error) {
    console.error("Error general:", error);

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      {
        status: 500,
      }
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch {}
  }
}