import { NextResponse } from "next/server";
import { fetchSlideNodes, fetchImageUrls } from "@/lib/figma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const slides = await fetchSlideNodes();
    const ids = slides.map((s) => s.id);
    const thumbnails = ids.length ? await fetchImageUrls(ids, "png", 1) : {};

    const result = slides.map((slide) => ({
      ...slide,
      thumbnailUrl: thumbnails[slide.id] ?? null,
    }));

    return NextResponse.json({ slides: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
