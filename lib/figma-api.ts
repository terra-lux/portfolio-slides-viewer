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
  scale?: number
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
      next: { revalidate: REVALIDATE_SECONDS },
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

export interface SlideNode {
  id: string;
  name: string;
}

// Enumerate the slides of a Figma Slides (presentation) file in deck order.
// The file endpoint returns the document tree; SLIDE nodes sit under the
// canvas (nested in SLIDE_GRID/SLIDE_ROW containers), and depth-first order
// matches the deck's reading order. depth=4 is deep enough to reach SLIDE
// nodes without pulling every slide's full contents into the payload.
export async function fetchSlideNodes(fileKey: string): Promise<SlideNode[]> {
  const token = requireToken();

  // depth caps the payload, but if Figma rejects the parameterized request
  // (e.g. it's stricter about params on slides decks), retry bare before
  // giving up — and surface Figma's own error body so failures are
  // diagnosable from the page instead of an opaque status code.
  let res = await fetch(`${FIGMA_API_BASE}/files/${fileKey}?depth=4`, {
    headers: { "X-Figma-Token": token },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (res.status === 400) {
    res = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
      headers: { "X-Figma-Token": token },
      next: { revalidate: REVALIDATE_SECONDS },
    });
  }

  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Figma 파일 정보를 불러오지 못했습니다 (${res.status}${body ? `: ${body}` : ""})`);
  }

  const data: { document?: FigmaFileNode } = await res.json();
  if (!data.document) {
    throw new Error("Figma 파일 응답에 document가 없습니다.");
  }

  const slides: SlideNode[] = [];
  const walk = (node: FigmaFileNode) => {
    if (node.type === "SLIDE") {
      slides.push({ id: node.id, name: node.name });
      return;
    }
    node.children?.forEach(walk);
  };
  walk(data.document);

  if (slides.length === 0) {
    throw new Error("파일에서 슬라이드를 찾지 못했습니다.");
  }

  return slides;
}

// Despite requesting them together, Figma's images endpoint gives every
// node id its own single-page PDF file (it does not merge them into one
// multi-page document) — so this returns a url per id, and the caller is
// responsible for merging the individual PDFs into one file.
export async function fetchFigmaPdfUrls(fileKey: string, nodeIds: string[]): Promise<Record<string, string>> {
  const images = await fetchImageUrls(fileKey, nodeIds, "pdf");
  const urls: Record<string, string> = {};
  for (const nodeId of nodeIds) {
    const url = images[nodeId];
    if (!url) {
      throw new Error(`"${nodeId}" 슬라이드의 PDF를 생성하지 못했습니다.`);
    }
    urls[nodeId] = url;
  }
  return urls;
}
