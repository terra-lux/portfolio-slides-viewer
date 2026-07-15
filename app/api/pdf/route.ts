import { NextRequest, NextResponse } from "next/server";
import { fetchImageUrls } from "@/lib/figma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const nodeId = request.nextUrl.searchParams.get("nodeId");
  const name = request.nextUrl.searchParams.get("name") ?? "slide";

  if (!nodeId) {
    return NextResponse.json({ error: "nodeId가 필요합니다." }, { status: 400 });
  }

  try {
    const images = await fetchImageUrls([nodeId], "pdf");
    const pdfUrl = images[nodeId];
    if (!pdfUrl) {
      return NextResponse.json({ error: "PDF를 생성하지 못했습니다." }, { status: 500 });
    }

    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) {
      return NextResponse.json({ error: "PDF 다운로드에 실패했습니다." }, { status: 500 });
    }

    const buffer = await pdfRes.arrayBuffer();
    const safeName = name.replace(/[^a-zA-Z0-9가-힣_-]/g, "_") || "slide";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
