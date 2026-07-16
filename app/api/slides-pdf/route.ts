import { fetchFigmaPdfUrl } from "@/lib/figma-api";
import { FIGMA_FILE_KEY, SLIDES } from "@/lib/figma-slides";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pdfUrl = await fetchFigmaPdfUrl(
      FIGMA_FILE_KEY,
      SLIDES.map((slide) => slide.id)
    );

    const fileRes = await fetch(pdfUrl);
    if (!fileRes.ok) {
      return new Response("Figma에서 PDF를 가져오지 못했습니다.", { status: 502 });
    }

    const buffer = await fileRes.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="portfolio.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return new Response(message, { status: 502 });
  }
}
