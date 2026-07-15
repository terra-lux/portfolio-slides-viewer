import { fetchSlideNodes, fetchImageUrls } from "@/lib/figma";
import RefreshButton from "./refresh-button";

export const dynamic = "force-dynamic";

interface SlideView {
  id: string;
  name: string;
  thumbnailUrl: string | null;
}

export default async function Home() {
  let slides: SlideView[] = [];
  let errorMessage: string | null = null;

  try {
    const nodes = await fetchSlideNodes();
    const ids = nodes.map((n) => n.id);
    const thumbnails = ids.length ? await fetchImageUrls(ids, "png", 1) : {};
    slides = nodes.map((n) => ({ ...n, thumbnailUrl: thumbnails[n.id] ?? null }));
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Portfolio Slides</h1>
        <RefreshButton />
      </div>

      {errorMessage && (
        <div
          style={{
            padding: 16,
            background: "#fee",
            color: "#900",
            borderRadius: 8,
            marginBottom: 24,
            whiteSpace: "pre-wrap",
          }}
        >
          {errorMessage}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            style={{ border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden", background: "#fff" }}
          >
            <div style={{ aspectRatio: "16 / 9", background: "#f4f4f4" }}>
              {slide.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.thumbnailUrl}
                  alt={slide.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
            </div>
            <div
              style={{
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
                {index + 1}. {slide.name}
              </span>
              <a
                href={`/api/pdf?nodeId=${encodeURIComponent(slide.id)}&name=${encodeURIComponent(slide.name)}`}
                style={{
                  fontSize: 13,
                  color: "#0070f3",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                PDF 다운로드
              </a>
            </div>
          </div>
        ))}
      </div>

      {!errorMessage && slides.length === 0 && <p>표시할 슬라이드가 없습니다.</p>}
    </main>
  );
}
