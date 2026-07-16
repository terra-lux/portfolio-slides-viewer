import { NextRequest } from "next/server";
import { fetchFigmaPngUrl } from "@/lib/figma-api";
import { FIGMA_FILE_KEY, SLIDES } from "@/lib/figma-slides";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get("nodeId") ?? "";

  const slide = SLIDES.find((s) => s.id === nodeId);
  if (!slide) {
    return new Response("Unknown slide", { status: 404 });
  }

  try {
    const imageUrl = await fetchFigmaPngUrl(FIGMA_FILE_KEY, slide.id, 2);
    return Response.redirect(imageUrl, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return new Response(message, { status: 502 });
  }
}
