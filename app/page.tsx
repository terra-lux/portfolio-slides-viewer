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

  // Local testing escape hatch: the dev sandbox can't reach figma.com, so
  // MOCK_FIGMA=1 swaps in a tiny fixed deck (paired with the mock in
  // /api/slide-pdf) to exercise the viewer and download flow end-to-end.
  if (process.env.MOCK_FIGMA === "1") {
    const pixel =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    groups = [
      { title: "표지", slideIds: ["m:1"] },
      { title: "본문", slideIds: ["m:2", "m:3"] },
      { title: "끝맺음", slideIds: ["m:4"] },
    ];
    imageUrls = { "m:1": pixel, "m:2": pixel, "m:3": pixel, "m:4": pixel };
    return <PortfolioViewer groups={groups} imageUrls={imageUrls} loadError={null} />;
  }

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
