import { revalidatePath } from "next/cache";
import { venueImageHandlers } from "@/lib/admin-venue-image-service";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const response = await venueImageHandlers.POST(request, id);
  if (response.status === 201) revalidatePath("/");
  return response;
}
