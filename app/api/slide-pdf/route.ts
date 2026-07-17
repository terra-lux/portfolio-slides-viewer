import { NextRequest } from "next/server";
import { fetchFigmaPdfUrl, fetchSlideGroups } from "@/lib/figma-api";
import { FIGMA_FILE_KEY, SLIDE_ALL_NODE_ID, SLIDE_ALL_NODE_NAME } from "@/lib/figma-slides";

// Serves ONE slide's single-page PDF. The full deck is merged client-side:
// a 53-page vector PDF far exceeds Vercel's 4.5MB function-response limit,
// so the server can never ship the merged file itself — but per-slide
// files are small, and the browser has no such limit when stitching them.
export const maxDuration = 30;

// Local testing escape hatch: the sandbox can't reach figma.com, so with
// MOCK_FIGMA=1 this returns a generated one-page PDF instead.
async function mockPdf(nodeId: string): Promise<Response> {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([1920, 1080]);
  page.drawText(`mock slide ${nodeId}`, { x: 100, y: 540, size: 64, font });
  const bytes = await doc.save();
  return new Response(bytes as unknown as BodyInit, {
    headers: { "Content-Type": "application/pdf" },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get("nodeId") ?? "";

  if (process.env.MOCK_FIGMA === "1") {
    return mockPdf(nodeId);
  }

  try {
    // Enumeration is fetch-cached (60s revalidate), so the 50+ per-slide
    // requests a single download triggers share one Figma files call; the
    // render call is per-slide by design to keep each request short.
    const groups = await fetchSlideGroups(FIGMA_FILE_KEY, SLIDE_ALL_NODE_ID, SLIDE_ALL_NODE_NAME);
    const nodeIds = groups.flatMap((group) => group.slideIds);
    if (!nodeIds.includes(nodeId)) {
      return new Response("Unknown slide", { status: 404 });
    }

    const pdfUrl = await fetchFigmaPdfUrl(FIGMA_FILE_KEY, nodeId);
    const fileRes = await fetch(pdfUrl, { cache: "no-store" });
    if (!fileRes.ok || !fileRes.body) {
      return new Response(`슬라이드 PDF를 가져오지 못했습니다. (${fileRes.status})`, { status: 502 });
    }

    return new Response(fileRes.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return new Response(message, { status: 502 });
  }
}
