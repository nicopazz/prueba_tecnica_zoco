import { NextResponse } from "next/server";
import { listPublicVenues } from "@/lib/public-venues";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const venues = await listPublicVenues({
    q: params.get("q") || "",
    city: params.get("city") || "",
    category: params.get("category") || "",
  });
  return NextResponse.json({ venues, count: venues.length }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
}
