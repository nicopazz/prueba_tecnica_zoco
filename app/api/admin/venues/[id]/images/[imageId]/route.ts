import { revalidatePath } from "next/cache";
import { venueImageHandlers } from "@/lib/admin-venue-image-service";

type Context = { params: Promise<{ id: string; imageId: string }> };

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: Context) {
  const { id, imageId } = await params;
  const response = await venueImageHandlers.DELETE(request, id, imageId);
  if (response.status === 200) revalidatePath("/");
  return response;
}
