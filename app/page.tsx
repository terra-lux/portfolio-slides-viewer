import PortfolioViewer from "./PortfolioViewer";
import { fetchFigmaPngUrls } from "@/lib/figma-api";
import { FIGMA_FILE_KEY, SLIDES } from "@/lib/figma-slides";

const PNG_SCALE = 1.5;

export default async function Home() {
  // Fetch every slide's image url in a couple of batched Figma calls
  // instead of one call per <img> tag — 53 near-simultaneous individual
  // requests was enough to trip Figma's rate limiting and drop some
  // slides. A url missing from the result (single bad frame, or the whole
  // call failing e.g. no token) just shows that slide's fallback text.
  let imageUrls: Record<string, string> = {};
  try {
    imageUrls = await fetchFigmaPngUrls(
      FIGMA_FILE_KEY,
      SLIDES.map((slide) => slide.id),
      PNG_SCALE
    );
  } catch {
    // leave imageUrls empty; PortfolioViewer falls back per-slide
  }

  return <PortfolioViewer imageUrls={imageUrls} />;
}
