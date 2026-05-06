import { NextResponse } from "next/server";

export const runtime = "nodejs"; // importante si necesitas setear User-Agent en Next.js

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
        "User-Agent": "MiApp/1.0 (nicolas@example.com)",
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams({ data: query }).toString(),
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";

    const text = await response.text();

    if (!response.ok) {
      console.error("Overpass no OK:", response.status, "content-type:", contentType);
      console.error("Overpass body (snippet):", text.slice(0, 2000));
      return NextResponse.json(
        { success: false, error: "Fallo la obtención de datos", detalle: `Overpass returned ${response.status}`, bodySnippet: text.slice(0, 2000) },
        { status: 502 }
      );
    }

    // Si el servidor devolvió HTML por error, no intentar parsear JSON
    if (!contentType.includes("application/json")) {
      console.warn("Respuesta de Overpass no es JSON:", contentType);
      return NextResponse.json(
        { success: false, error: "Respuesta inesperada de Overpass", detalle: contentType, bodySnippet: text.slice(0, 2000) },
        { status: 502 }
      );
    }

    const data = JSON.parse(text);

    type OSMElement = { tags?: Record<string, string>; lat: number; lon: number };

    const rawVenues = (data.elements || [])
      .filter((el: OSMElement) => el.tags && el.tags.name)
      .map((el: OSMElement) => ({
        originalName: el.tags!.name,
        location: el.tags!["addr:street"]
          ? `${el.tags!["addr:street"]} ${el.tags!["addr:housenumber"] || ""}`.trim()
          : `Lat: ${el.lat}, Lon: ${el.lon}`,
        source: "Overpass API",
      }));

    return NextResponse.json({
      success: true,
      message: `Se encontraron ${rawVenues.length} lugares.`,
      data: rawVenues,
    });

  } catch (error) {
    console.error("Error REAL en la terminal:", error);
    return NextResponse.json(
      { success: false, error: "Fallo la obtención de datos", detalle: String(error) },
      { status: 500 }
    );
  }
}
