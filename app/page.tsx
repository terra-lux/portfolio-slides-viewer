"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SLIDES } from "@/lib/figma-slides";

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;
const DESKTOP_QUERY = "(min-width: 768px)";

export default function Home() {
  const [zoom, setZoom] = useState(100);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedSlides, setFailedSlides] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const markFailed = (slideId: string) => {
    setFailedSlides((prev) => (prev[slideId] ? prev : { ...prev, [slideId]: true }));
  };

  useEffect(() => {
    // The page HTML is prerendered with <img src> already set, so a fast
    // same-origin failure can resolve before hydration attaches onError.
    // Catch that race by checking each image's load state once on mount.
    imgRefs.current.forEach((img, idx) => {
      if (img && img.complete && img.naturalWidth === 0) {
        markFailed(SLIDES[idx].id);
      }
    });
  }, []);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const applyMatch = (matches: boolean) => {
      setIsDesktop(matches);
      setSidebarOpen(matches);
    };
    applyMatch(mql.matches);
    const listener = (e: MediaQueryListEvent) => applyMatch(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (mostVisible) {
          const idx = slideRefs.current.findIndex((el) => el === mostVisible.target);
          if (idx !== -1) setCurrentIndex(idx);
        }
      },
      { root, threshold: [0.25, 0.5, 0.75] }
    );

    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToSlide = (idx: number) => {
    // Set the highlight immediately instead of waiting for the smooth-scroll
    // to finish and the IntersectionObserver to catch up — otherwise
    // reopening the (mobile, auto-closing) sidebar right after a click shows
    // the previous slide as "current" for a moment.
    setCurrentIndex(idx);
    slideRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!isDesktop) setSidebarOpen(false);
  };

  return (
    <div style={{ background: "#0d0d0d" }}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? "목차 닫기" : "목차 열기"}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      <div
        className={`sidebar-backdrop ${sidebarOpen && !isDesktop ? "is-visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 16, marginTop: 40 }}>목차</div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {SLIDES.map((slide, idx) => (
            <li key={slide.id}>
              <button
                type="button"
                onClick={() => scrollToSlide(idx)}
                style={{
                  ...tocButtonStyle,
                  background: idx === currentIndex ? "rgba(255,255,255,0.12)" : "transparent",
                  color: idx === currentIndex ? "#fff" : "#999",
                }}
              >
                <span style={{ opacity: 0.5, marginRight: 8 }}>{String(idx + 1).padStart(2, "0")}</span>
                {slide.title}
              </button>
            </li>
          ))}
        </ol>

        <a href="/api/slides-pdf" download style={downloadButtonStyle}>
          전체 슬라이드 PDF 다운로드
        </a>
      </aside>

      <div ref={containerRef} className={`main-area ${sidebarOpen && isDesktop ? "sidebar-open" : ""}`}>
        <div
          className="slide-list"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
          }}
        >
          {SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              ref={(el) => {
                slideRefs.current[idx] = el;
              }}
              className="slide-page"
            >
              <div
                style={{
                  width: "min(1600px, 90vw)",
                  aspectRatio: "16 / 9",
                  background: "#1a1a1a",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#666",
                  fontSize: 13,
                }}
              >
                {failedSlides[slide.id] ? (
                  "이미지를 불러오지 못했습니다 (FIGMA_API_TOKEN 설정을 확인해 주세요)"
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={(el) => {
                      imgRefs.current[idx] = el;
                    }}
                    src={`/api/slide-image?nodeId=${encodeURIComponent(slide.id)}&format=png`}
                    alt={slide.title}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    loading={idx < 2 ? "eager" : "lazy"}
                    onError={() => markFailed(slide.id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="zoom-bar" style={zoomBarStyle}>
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
      </div>
    </div>
  );
}

const tocButtonStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
};

const downloadButtonStyle: CSSProperties = {
  marginTop: 24,
  display: "block",
  textAlign: "center",
  padding: "10px 12px",
  borderRadius: 8,
  background: "#fff",
  color: "#111",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
};

const zoomBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 2,
  background: "rgba(20, 20, 20, 0.85)",
  borderRadius: 999,
  padding: 4,
  boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
};

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
