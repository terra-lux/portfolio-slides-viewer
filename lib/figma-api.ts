const FIGMA_API_BASE = "https://api.figma.com/v1";

// Figma content doesn't change second-to-second, so a short cache window
// avoids re-hitting Figma's (fairly slow) render API on every page view
// while still keeping the site close to "live".
const REVALIDATE_SECONDS = 60;

// Keep each images-endpoint request to a modest number of ids — a single
// call for 50+ ids is untested territory (render time, possible caps) and
// makes failures hard to isolate. Chunking trades one big request for a
// few smaller, more predictable ones.
const IDS_PER_REQUEST = 20;

const MAX_RETRIES = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function requireToken(): string {
  const token = process.env.FIGMA_API_TOKEN;
  if (!token) {
    throw new Error("FIGMA_API_TOKEN 환경변수가 설정되지 않았습니다.");
  }
  return token;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchImagesBatch(
  fileKey: string,
  nodeIds: string[],
  format: "png" | "pdf",
  scale?: number,
  revalidateSeconds: number = REVALIDATE_SECONDS
): Promise<Record<string, string | null>> {
  const token = requireToken();
  const params = new URLSearchParams({ ids: nodeIds.join(","), format });
  if (format === "png" && scale) {
    params.set("scale", String(scale));
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${FIGMA_API_BASE}/images/${fileKey}?${params}`, {
      headers: { "X-Figma-Token": token },
      next: { revalidate: revalidateSeconds },
    });

    // 429 (rate limited) and 5xx are worth retrying with backoff; anything
    // else (bad token, bad ids) will just fail the same way again.
    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`Figma API 오류 (${res.status})`);
      if (attempt < MAX_RETRIES) {
        await sleep(300 * 2 ** attempt);
        continue;
      }
      throw lastError;
    }

    if (!res.ok) {
      throw new Error(`Figma API 오류 (${res.status})`);
    }

    const data: { images: Record<string, string | null>; err?: string | null } = await res.json();
    if (data.err) {
      throw new Error(data.err);
    }

    return data.images;
  }

  throw lastError ?? new Error("Figma API 요청에 실패했습니다.");
}

async function fetchImageUrls(
  fileKey: string,
  nodeIds: string[],
  format: "png" | "pdf",
  scale?: number
): Promise<Record<string, string | null>> {
  const batches = await Promise.all(
    chunk(nodeIds, IDS_PER_REQUEST).map((batch) => fetchImagesBatch(fileKey, batch, format, scale))
  );
  return Object.assign({}, ...batches);
}

// One url per slide, keyed by node id. Missing/failed ids are simply absent
// from the result (rather than failing the whole call) so a single bad
// frame doesn't take down every other slide on the page.
export async function fetchFigmaPngUrls(
  fileKey: string,
  nodeIds: string[],
  scale: number
): Promise<Record<string, string>> {
  const images = await fetchImageUrls(fileKey, nodeIds, "png", scale);
  const urls: Record<string, string> = {};
  for (const [id, url] of Object.entries(images)) {
    if (url) urls[id] = url;
  }
  return urls;
}

interface FigmaFileNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaFileNode[];
}

export interface SlideGroup {
  title: string;
  slideIds: string[];
}

// Read the deck structure live from the design file's Slide_All auto-layout
// frame: its direct children are the TOC sections (layer name = section
// title), and each section's own children are that section's individual
// slides, in auto-layout order. depth=4 reaches those slide frames without
// pulling every slide's full contents into the payload (canvas=1,
// Slide_All=2, sections=3, slides=4).
export async function fetchSlideGroups(
  fileKey: string,
  rootNodeId: string,
  rootNodeName: string
): Promise<SlideGroup[]> {
  const token = requireToken();

  const res = await fetch(`${FIGMA_API_BASE}/files/${fileKey}?depth=4`, {
    headers: { "X-Figma-Token": token },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Figma 파일 정보를 불러오지 못했습니다 (${res.status}${body ? `: ${body}` : ""})`);
  }

  const data: { document?: FigmaFileNode } = await res.json();
  if (!data.document) {
    throw new Error("Figma 파일 응답에 document가 없습니다.");
  }

  // Prefer the stable node id; fall back to the layer name so the deck
  // survives the frame being recreated (copy-paste gives it a new id).
  let root: FigmaFileNode | null = null;
  const findRoot = (node: FigmaFileNode) => {
    if (node.id === rootNodeId) {
      root = node;
      return;
    }
    if (!root && node.name === rootNodeName && node.type === "FRAME") {
      root = node;
    }
    if (node.id !== rootNodeId) node.children?.forEach(findRoot);
  };
  findRoot(data.document);

  if (!root) {
    throw new Error(`"${rootNodeName}" 프레임을 파일에서 찾지 못했습니다.`);
  }

  const groups: SlideGroup[] = (root as FigmaFileNode).children
    ?.map((section) => ({
      title: section.name,
      slideIds: (section.children ?? []).map((slide) => slide.id),
    }))
    .filter((group) => group.slideIds.length > 0) ?? [];

  if (groups.length === 0) {
    throw new Error(`"${rootNodeName}" 프레임 안에서 슬라이드를 찾지 못했습니다.`);
  }

  return groups;
}

// Render ONE slide to a single-page PDF and return its url. Kept to a
// single id on purpose: a 20-id batch makes Figma render 20 PDFs inside
// one request, which can outlast the serverless time budget — one render
// is a couple of seconds and each slide caches independently. PDF renders
// cache longer than page images (5 min vs 60s): the render is the whole
// cost of a download, and a marginally staler PDF is a fine trade for a
// retry or second download completing near-instantly.
const PDF_REVALIDATE_SECONDS = 300;

export async function fetchFigmaPdfUrl(fileKey: string, nodeId: string): Promise<string> {
  const images = await fetchImagesBatch(fileKey, [nodeId], "pdf", undefined, PDF_REVALIDATE_SECONDS);
  const url = images[nodeId];
  if (!url) {
    throw new Error("Figma가 PDF를 생성하지 못했습니다.");
  }
  return url;
}
