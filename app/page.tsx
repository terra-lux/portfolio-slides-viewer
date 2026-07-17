import PortfolioViewer from "./PortfolioViewer";
import { fetchFigmaPngUrls, fetchSlideGroups, type SlideGroup } from "@/lib/figma-api";
import { FIGMA_FILE_KEY, SLIDE_ALL_NODE_ID, SLIDE_ALL_NODE_NAME } from "@/lib/figma-slides";

export const revalidate = 60;

const PNG_SCALE = 1.5;

export default async function Home() {
  // Read the deck structure straight from the design file so sections and
  // slides always match Figma, then resolve every slide's image url in a
  // few batched calls — one request per <img> was enough to trip Figma's
  // rate limiting and drop slides.
  let groups: SlideGroup[] = [];
  let imageUrls: Record<string, string> = {};
  let loadError: string | null = null;

  try {
    groups = await fetchSlideGroups(FIGMA_FILE_KEY, SLIDE_ALL_NODE_ID, SLIDE_ALL_NODE_NAME);
    imageUrls = await fetchFigmaPngUrls(
      FIGMA_FILE_KEY,
      groups.flatMap((group) => group.slideIds),
      PNG_SCALE
    );
  } catch (err) {
    loadError = err instanceof Error ? err.message : "알 수 없는 오류";
  }

  return <PortfolioViewer groups={groups} imageUrls={imageUrls} loadError={loadError} />;
}
