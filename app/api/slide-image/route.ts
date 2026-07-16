import { NextRequest } from "next/server";
import { fetchFigmaImageUrl } from "@/lib/figma-api";
import { FIGMA_FILE_KEY, SLIDES } from "@/lib/figma-slides";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get("nodeId") ?? "";
  const format = searchParams.get("format") === "pdf" ? "pdf" : "png";

  const slide = SLIDES.find((s) => s.id === nodeId);
  if (!slide) {
    return new Response("Unknown slide", { status: 404 });
  }

  try {
    const imageUrl = await fetchFigmaImageUrl(
      FIGMA_FILE_KEY,
      slide.id,
      format,
      format === "png" ? 2 : undefined
    );

    if (format === "pdf") {
      const fileRes = await fetch(imageUrl);
      if (!fileRes.ok) {
        return new Response("Figma에서 PDF를 가져오지 못했습니다.", { status: 502 });
      }
      const buffer = await fileRes.arrayBuffer();
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(slide.title)}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return Response.redirect(imageUrl, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return new Response(message, { status: 502 });
  }
}
