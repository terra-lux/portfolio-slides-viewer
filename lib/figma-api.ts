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

// Figma renders every requested node id into a single multi-page PDF (one
// page per id, in the order given) and maps each id to that same file URL.
export async function fetchFigmaPdfUrl(fileKey: string, nodeIds: string[]): Promise<string> {
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

  const url = Object.values(data.images).find((value): value is string => Boolean(value));
  if (!url) {
    throw new Error("Figma가 PDF를 생성하지 못했습니다.");
  }

  return url;
}
