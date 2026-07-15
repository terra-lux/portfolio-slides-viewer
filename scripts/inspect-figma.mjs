#!/usr/bin/env node
// 실제 Figma 파일의 노드 구조를 확인하기 위한 진단 스크립트.
// 사용법: FIGMA_TOKEN=xxx FIGMA_FILE_KEY=xxx node scripts/inspect-figma.mjs

const token = process.env.FIGMA_TOKEN;
const fileKey = process.env.FIGMA_FILE_KEY;

if (!token || !fileKey) {
  console.error("FIGMA_TOKEN, FIGMA_FILE_KEY 환경변수를 설정한 뒤 실행해주세요.");
  console.error("예: FIGMA_TOKEN=xxx FIGMA_FILE_KEY=xxx node scripts/inspect-figma.mjs");
  process.exit(1);
}

const res = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=2`, {
  headers: { "X-Figma-Token": token },
});

if (!res.ok) {
  console.error(`요청 실패 (${res.status}):`, await res.text());
  process.exit(1);
}

const data = await res.json();
const page = data.document.children?.[0];

console.log("파일 이름:", data.name);
console.log("editorType:", data.editorType);
console.log("최상위 페이지:", page?.name, `(type: ${page?.type})`);
console.log("");
console.log("직속 하위 노드 목록 (lib/figma.ts 의 슬라이드 후보):");
for (const child of page?.children ?? []) {
  console.log(`  - [${child.type}] ${child.name} (id: ${child.id})`);
}
