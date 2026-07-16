export const FIGMA_FILE_KEY = "A5h77h7eFmGlWt8zgggBMx";

// Each entry mirrors one direct child of the "Slide_All" auto-layout frame
// (node-id 343:59761) — its layer name is the TOC label. slideIds lists
// that child's own direct children in auto-layout order: for most sections
// that's a single 1920x1080 "Frame", but the case-study sections are
// themselves a horizontal row of many individual 1920x1080 screens, each
// shown as its own slide.
export const GROUPS = [
  { title: "표지", slideIds: ["343:51666"] },
  { title: "프로필", slideIds: ["343:51679"] },
  { title: "목차", slideIds: ["343:51752"] },
  {
    title: "차별화상회 소셜로그인 도입",
    slideIds: [
      "343:52457",
      "343:52572",
      "343:52619",
      "343:52649",
      "343:52711",
      "343:52737",
      "343:52818",
      "343:52946",
      "343:53073",
      "343:53129",
      "343:53187",
      "343:53229",
      "343:53286",
      "343:53329",
      "343:53367",
      "343:53388",
    ],
  },
  {
    title: "차별화장부 1.0 오픈",
    slideIds: [
      "343:53542",
      "343:53630",
      "343:53661",
      "343:53691",
      "343:53746",
      "343:53823",
      "343:53886",
      "343:53997",
      "343:54048",
      "343:54112",
      "343:54238",
      "343:54293",
      "343:54360",
      "343:54381",
    ],
  },
  {
    title: "공비서 예약앱 오픈",
    slideIds: [
      "343:54579",
      "343:54703",
      "343:54738",
      "343:54765",
      "343:54824",
      "343:54904",
      "343:54982",
      "343:55089",
      "343:55129",
      "343:55453",
      "343:55468",
      "343:55511",
      "343:55551",
      "343:55572",
    ],
  },
  {
    title: "사이드 프로젝트",
    slideIds: ["343:55687", "343:55787", "343:55804", "343:55873", "343:55887"],
  },
  { title: "끝맺음", slideIds: ["343:55905"] },
] as const;

export const SLIDES = GROUPS.flatMap((group, groupIndex) =>
  group.slideIds.map((id) => ({ id, groupIndex }))
);
