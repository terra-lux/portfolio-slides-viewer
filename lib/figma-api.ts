const FIGMA_API_BASE = "https://api.figma.com/v1";

export async function fetchFigmaImageUrl(
  fileKey: string,
  nodeId: string,
  format: "png" | "pdf",
  scale?: number
): Promise<string> {
  const token = process.env.FIGMA_API_TOKEN;
  if (!token) {
    throw new Error("FIGMA_API_TOKEN 환경변수가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({ ids: nodeId, format });
  if (format === "png" && scale) {
    params.set("scale", String(scale));
  }

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
