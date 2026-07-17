import PortfolioViewer from "./PortfolioViewer";
import { fetchFigmaPngUrls, fetchSlideNodes, type SlideNode } from "@/lib/figma-api";
import { FIGMA_FILE_KEY } from "@/lib/figma-slides";

export const revalidate = 60;

const PNG_SCALE = 1.5;

export default async function Home() {
  // Enumerate the deck straight from the Slides file so order (and any
  // added/removed slides) always matches Figma, then resolve every slide's
  // image url in a few batched calls — one request per <img> was enough to
  // trip Figma's rate limiting and drop slides.
  let slides: SlideNode[] = [];
  let imageUrls: Record<string, string> = {};
  let loadError: string | null = null;

  try {
    slides = await fetchSlideNodes(FIGMA_FILE_KEY);
    imageUrls = await fetchFigmaPngUrls(
      FIGMA_FILE_KEY,
      slides.map((slide) => slide.id),
      PNG_SCALE
    );
  } catch (err) {
    loadError = err instanceof Error ? err.message : "알 수 없는 오류";
  }

  return <PortfolioViewer slides={slides} imageUrls={imageUrls} loadError={loadError} />;
}
