const FIGMA_API_BASE = "https://api.figma.com/v1";

export interface FigmaSlide {
  id: string;
  name: string;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

function getHeaders() {
  const token = process.env.FIGMA_TOKEN;
  if (!token) {
    throw new Error("FIGMA_TOKEN 환경변수가 설정되지 않았습니다.");
  }
  return { "X-Figma-Token": token };
}

export function getFileKey() {
  const key = process.env.FIGMA_FILE_KEY;
  if (!key) {
    throw new Error("FIGMA_FILE_KEY 환경변수가 설정되지 않았습니다.");
  }
  return key;
}

// Figma Slides 파일의 슬라이드 노드 타입은 공식 문서에 명시되어 있지 않아,
// document > 첫 페이지 > 직속 자식 노드를 슬라이드로 간주한다.
// scripts/inspect-figma.mjs 로 실제 구조를 확인해 필요하면 조정할 것.
export async function fetchSlideNodes(): Promise<FigmaSlide[]> {
  const fileKey = getFileKey();
  const res = await fetch(`${FIGMA_API_BASE}/files/${fileKey}?depth=2`, {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Figma 파일을 불러오지 못했습니다 (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const document: FigmaNode = data.document;
  const page: FigmaNode | undefined = document.children?.[0];

  if (!page?.children?.length) {
    throw new Error("슬라이드를 찾을 수 없습니다. Figma 파일 구조를 확인해주세요.");
  }

  return page.children.map((node) => ({ id: node.id, name: node.name }));
}

export async function fetchImageUrls(
  nodeIds: string[],
  format: "png" | "pdf",
  scale = 2
): Promise<Record<string, string>> {
  const fileKey = getFileKey();
  const params = new URLSearchParams({
    ids: nodeIds.join(","),
    format,
  });
  if (format === "png") {
    params.set("scale", String(scale));
  }

  const res = await fetch(`${FIGMA_API_BASE}/images/${fileKey}?${params.toString()}`, {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Figma 이미지를 내보내지 못했습니다 (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  if (data.err) {
    throw new Error(`Figma 이미지 내보내기 오류: ${data.err}`);
  }

  return data.images as Record<string, string>;
}
