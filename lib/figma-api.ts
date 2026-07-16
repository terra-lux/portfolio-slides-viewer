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

  const res = await fetch(`${FIGMA_API_BASE}/images/${fileKey}?${params}`, {
    headers: { "X-Figma-Token": token },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(`Figma API 오류 (${res.status})`);
  }

  const data: { images: Record<string, string | null>; err?: string | null } = await res.json();
  if (data.err) {
    throw new Error(data.err);
  }

  return data.images;
}

export async function fetchFigmaPngUrl(fileKey: string, nodeId: string, scale: number): Promise<string> {
  const images = await fetchImagesBatch(fileKey, [nodeId], "png", scale);
  const url = images[nodeId];
  if (!url) {
    throw new Error("Figma가 이미지를 생성하지 못했습니다.");
  }
  return url;
}

// Despite requesting them together, Figma's images endpoint gives every
// node id its own single-page PDF file (it does not merge them into one
// multi-page document) — so this returns a url per id, and the caller is
// responsible for merging the individual PDFs into one file.
export async function fetchFigmaPdfUrls(fileKey: string, nodeIds: string[]): Promise<Record<string, string>> {
  const batches = await Promise.all(
    chunk(nodeIds, IDS_PER_REQUEST).map((batch) => fetchImagesBatch(fileKey, batch, "pdf"))
  );

  const urls: Record<string, string> = {};
  for (const nodeId of nodeIds) {
    const url = batches.reduce<string | null>((found, batch) => found ?? batch[nodeId] ?? null, null);
    if (!url) {
      throw new Error(`"${nodeId}" 슬라이드의 PDF를 생성하지 못했습니다.`);
    }
    urls[nodeId] = url;
  }

  return urls;
}
