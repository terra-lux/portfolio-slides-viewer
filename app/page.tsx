"use client";

import { useState, type CSSProperties } from "react";

const FIGMA_FILE_KEY = "oLIcsWKoq4cpCBvba6G7qv";
const FIGMA_FILE_SLUG = "-2026--Portfolio_CHJ";
const FIGMA_EMBED_URL = `https://embed.figma.com/deck/${FIGMA_FILE_KEY}/${FIGMA_FILE_SLUG}?embed-host=portfolio-slides-viewer&viewport-controls=true`;

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

export default function Home() {
  const [zoom, setZoom] = useState(100);
  const scale = zoom / 100;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "auto", background: "#111" }}>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <iframe
          src={FIGMA_EMBED_URL}
          allowFullScreen
          style={{ width: "100vw", height: "100vh", border: "none" }}
        />
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "rgba(20, 20, 20, 0.85)",
          borderRadius: 999,
          padding: 4,
          boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
          disabled={zoom <= ZOOM_MIN}
          aria-label="축소"
          style={zoomButtonStyle}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoom(100)}
          aria-label="100%로 초기화"
          style={{ ...zoomButtonStyle, width: 56, fontSize: 13 }}
        >
          {zoom}%
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
          disabled={zoom >= ZOOM_MAX}
          aria-label="확대"
          style={zoomButtonStyle}
        >
          +
        </button>
      </div>

      {/*
        TODO(포트폴리오 PDF/목차): 개별 슬라이드 무손실 PDF 다운로드와 좌측 슬라이드
        목차는 Figma REST API(GET /v1/files, GET /v1/images?format=pdf)로 슬라이드
        노드 구조를 읽어야 구현할 수 있음. 이 파일은 Figma Slides 파일이라 Figma MCP의
        get_metadata/get_design_context가 지원하지 않아, 현재는 자동으로 슬라이드
        목록을 가져올 방법이 없음. Figma Personal Access Token(읽기 권한)을 받으면
        서버(API route)에서 REST API를 직접 호출해 두 기능을 추가할 수 있음.
      */}
    </div>
  );
}

const zoomButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "none",
  background: "transparent",
  color: "#fff",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
