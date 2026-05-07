import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Fuerza ejecución en entorno Node.js
export const runtime = "nodejs";

// Email de contacto requerido por Overpass API
const contact = process.env.OVERPASS_CONTACT || "soporte@miapp.com";

// API Key de Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Cliente de Prisma para PostgreSQL
const prisma = new PrismaClient();

// Inicialización del cliente de Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Tipado de elementos recibidos desde Overpass
type OSMElement = {
  tags?: Record<string, string>;
  lat: number;
  lon: number;
};

// Estructura esperada luego del procesamiento con IA
type ProcessedVenue = {
  originalName: string;
  normalizedName: string;
  category: string;
  location: string;
  confidence: number | null;
};

export async function GET() {
  console.log("Iniciando sincronización con Overpass API...");

  // Consulta Overpass para bares y pubs en Tucumán
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="bar"](-26.85, -65.30, -26.75, -65.15);
      node["amenity"="pub"](-26.85, -65.30, -26.75, -65.15);
    );
    out body 15;
  `;

  try {
    // Request hacia Overpass API
    const response = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "User-Agent": `MiApp/1.0 (${contact})`,
          Accept: "*/*",
          "Content-Type":
            "application/x-www-form-urlencoded; charset=UTF-8",
        },

        body: new URLSearchParams({
          data: query,
        }).toString(),

        cache: "no-store",
      }
    );

    const text = await response.text();

    // Manejo de errores de Overpass
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

    // Limpieza inicial de datos provenientes de OSM
    const rawVenues = (data.elements || [])
      .filter((el: OSMElement) => el.tags && el.tags.name)
      .map((el: OSMElement) => ({
        originalName: el.tags!.name,

        // Usa dirección si existe, sino coordenadas
        location: el.tags!["addr:street"]
          ? `${el.tags!["addr:street"]} ${
              el.tags!["addr:housenumber"] || ""
            }`.trim()
          : `Lat: ${el.lat}, Lon: ${el.lon}`,

        source: "Overpass API",
      }));

    // Si no se encontraron resultados
    if (rawVenues.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No se encontraron datos.",
      });
    }

    console.log(
      `Enviando ${rawVenues.length} lugares a Gemini para limpieza...`
    );

    // Prompt utilizado para limpieza y normalización con IA
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
      // Modelo Gemini utilizado
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",

        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      // Generación de contenido con IA
      const aiResponse = await model.generateContent(prompt);

      let aiContent = "";

      try {
        // Extrae el texto de la respuesta
        aiContent = await aiResponse.response.text();
      } catch {
        aiContent = JSON.stringify(aiResponse.response || "");
      }

      try {
        // Parseo seguro del JSON generado por Gemini
        const parsed = JSON.parse(
          aiContent || '{"venues":[]}'
        );

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

    // Fallback si Gemini falla o devuelve datos inválidos
    if (!processedVenues || processedVenues.length === 0) {
      console.log(
        "Usando fallback: normalización básica sin IA."
      );

      processedVenues = rawVenues.map(
        (v: {
          originalName: string;
          location: string;
          source: string;
        }) => ({
          originalName: v.originalName,

          // Limpieza simple de palabras comunes
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

    console.log(
      "Guardando en la base de datos PostgreSQL..."
    );

    let savedCount = 0;

    // Guarda o actualiza registros en la base de datos
    for (const venue of processedVenues) {
      try {
        await prisma.venue.upsert({
          where: {
            normalizedName_location: {
              normalizedName: venue.normalizedName,
              location: venue.location,
            },
          },

          // Actualiza datos si el registro ya existe
          update: {
            originalName: venue.originalName,
            category: venue.category,
            updatedAt: new Date(),
            confidence: venue.confidence ?? null,
          },

          // Crea nuevo registro si no existe
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
            venue.normalizedName ||
            venue.originalName
          }:`,
          dbError
        );
      }
    }

    // Respuesta final
    return NextResponse.json({
      success: true,
      message: `Sincronización completa. ${savedCount} registros procesados y guardados.`,
      data: processedVenues,
    });
  } catch (error) {
    console.error("Error general:", error);

    // Error general del proceso
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
    // Cierra conexión Prisma
    try {
      await prisma.$disconnect();
    } catch {}
  }
}