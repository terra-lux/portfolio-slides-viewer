const FIGMA_API_BASE = "https://api.figma.com/v1";

function requireToken(): string {
  const token = process.env.FIGMA_API_TOKEN;
  if (!token) {
    throw new Error("FIGMA_API_TOKEN 환경변수가 설정되지 않았습니다.");
  }
  return token;
}

export async function fetchFigmaPngUrl(fileKey: string, nodeId: string, scale: number): Promise<string> {
  const token = requireToken();
  const params = new URLSearchParams({ ids: nodeId, format: "png", scale: String(scale) });

  const res = await fetch(`${FIGMA_API_BASE}/images/${fileKey}?${params}`, {
    headers: { "X-Figma-Token": token },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Figma API 오류 (${res.status})`);
  }

  const data: { images: Record<string, string | null>; err?: string | null } = await res.json();
  if (data.err) {
    throw new Error(data.err);
  }

  const url = data.images[nodeId];
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
  const token = requireToken();
  const params = new URLSearchParams({ ids: nodeIds.join(","), format: "pdf" });

  const res = await fetch(`${FIGMA_API_BASE}/images/${fileKey}?${params}`, {
    headers: { "X-Figma-Token": token },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Figma API 오류 (${res.status})`);
  }

  const data: { images: Record<string, string | null>; err?: string | null } = await res.json();
  if (data.err) {
    throw new Error(data.err);
  }

  const urls: Record<string, string> = {};
  for (const nodeId of nodeIds) {
    const url = data.images[nodeId];
    if (!url) {
      throw new Error(`"${nodeId}" 슬라이드의 PDF를 생성하지 못했습니다.`);
    }
    urls[nodeId] = url;
  }

  return urls;
}
