const FIGMA_FILE_KEY = "oLIcsWKoq4cpCBvba6G7qv";
const FIGMA_FILE_SLUG = "-2026--Portfolio_CHJ";
const FIGMA_EMBED_URL = `https://embed.figma.com/deck/${FIGMA_FILE_KEY}/${FIGMA_FILE_SLUG}?embed-host=portfolio-slides-viewer&viewport-controls=true`;

export default function Home() {
  return (
    <iframe
      src={FIGMA_EMBED_URL}
      allowFullScreen
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: "none" }}
    />
  );
}
