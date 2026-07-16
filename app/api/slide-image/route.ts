import { NextRequest } from "next/server";
import { fetchFigmaPngUrl } from "@/lib/figma-api";
import { FIGMA_FILE_KEY, SLIDES } from "@/lib/figma-slides";

export const dynamic = "force-dynamic";

// Figma's image export has a practical output-size ceiling, and some of
// these frames are extremely wide (panoramic case-study spreads), so scale
// down oversized frames instead of requesting a fixed 2x for everyone.
const MAX_OUTPUT_DIMENSION = 4096;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get("nodeId") ?? "";

  const slide = SLIDES.find((s) => s.id === nodeId);
  if (!slide) {
    return new Response("Unknown slide", { status: 404 });
  }

  const scale = Math.min(2, MAX_OUTPUT_DIMENSION / Math.max(slide.width, slide.height));

  try {
    const imageUrl = await fetchFigmaPngUrl(FIGMA_FILE_KEY, slide.id, scale);
    return Response.redirect(imageUrl, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return new Response(message, { status: 502 });
  }
}
