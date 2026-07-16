import { PDFDocument } from "pdf-lib";
import { fetchFigmaPdfUrls } from "@/lib/figma-api";
import { FIGMA_FILE_KEY, SLIDES } from "@/lib/figma-slides";

export const revalidate = 60;
export const maxDuration = 60;

export async function GET() {
  try {
    const nodeIds = SLIDES.map((slide) => slide.id);
    const pdfUrls = await fetchFigmaPdfUrls(FIGMA_FILE_KEY, nodeIds);

    // Download every slide's single-page PDF in parallel (there can be
    // several dozen), but merge them back in slide order regardless of
    // which fetch finishes first.
    const sourceBytesList = await Promise.all(
      nodeIds.map(async (nodeId) => {
        const fileRes = await fetch(pdfUrls[nodeId]);
        if (!fileRes.ok) {
          throw new Error(`"${nodeId}" 슬라이드의 PDF를 가져오지 못했습니다. (${fileRes.status})`);
        }
        return fileRes.arrayBuffer();
      })
    );

    const merged = await PDFDocument.create();
    for (const sourceBytes of sourceBytesList) {
      const source = await PDFDocument.load(sourceBytes);
      const copiedPages = await merged.copyPages(source, source.getPageIndices());
      copiedPages.forEach((page) => merged.addPage(page));
    }

    // Fail loudly instead of silently shipping a short file if merging
    // somehow dropped pages.
    if (merged.getPageCount() !== SLIDES.length) {
      throw new Error(
        `병합된 PDF 페이지 수(${merged.getPageCount()})가 슬라이드 수(${SLIDES.length})와 다릅니다.`
      );
    }

    const mergedBytes = await merged.save();

    return new Response(mergedBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="portfolio.pdf"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return new Response(message, { status: 502 });
  }
}
