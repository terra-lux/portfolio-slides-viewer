import RefreshButton from "./refresh-button";

const FIGMA_FILE_KEY = "oLIcsWKoq4cpCBvba6G7qv";
const FIGMA_FILE_SLUG = "-2026--Portfolio_CHJ";
const FIGMA_FILE_URL = `https://www.figma.com/deck/${FIGMA_FILE_KEY}/${FIGMA_FILE_SLUG}`;
const FIGMA_EMBED_URL = `https://embed.figma.com/slides/${FIGMA_FILE_KEY}/${FIGMA_FILE_SLUG}?embed-host=portfolio-slides-viewer&footer=false&page-selector=false`;

export default function Home() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Portfolio Slides</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={FIGMA_FILE_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Figma에서 PDF로 내보내기
          </a>
          <RefreshButton />
        </div>
      </div>

      <p style={{ color: "#666", fontSize: 14, marginBottom: 20 }}>
        아래 미리보기는 Figma 파일과 연결되어 있어 슬라이드를 수정하면 자동으로 반영됩니다. 슬라이드를 PDF로
        받으려면 위의 &quot;Figma에서 PDF로 내보내기&quot; 버튼으로 이동해 Figma 화면에서{" "}
        <strong>File → Export slides to → PDF</strong>를 사용해주세요.
      </p>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "80vh",
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          overflow: "hidden",
          background: "#f4f4f4",
        }}
      >
        <iframe
          src={FIGMA_EMBED_URL}
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
        />
      </div>
    </main>
  );
}
