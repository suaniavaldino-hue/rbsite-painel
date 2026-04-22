import "server-only";

import { BRAND } from "@/lib/constants/brand";
import { getCanonicalPanelUrl } from "@/lib/utils/env";
import type { PlannerItem } from "@/types/planner";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 4);
}

function buildSvgTextLines(lines: string[], startY: number, fontSize: number) {
  return lines
    .map((line, index) => {
      const y = startY + index * (fontSize + 14);
      return `<text x="96" y="${y}" fill="#081726" font-size="${fontSize}" font-weight="700" letter-spacing="-1.2">${escapeXml(line)}</text>`;
    })
    .join("");
}

export function buildPlannerAssetUrls(itemId: string, slideCount = 0) {
  const baseUrl = `${getCanonicalPanelUrl()}/api/planner/assets/${itemId}`;
  const carouselUrls = Array.from({ length: slideCount }, (_, index) => {
    return `${baseUrl}?slide=${index + 1}`;
  });

  return {
    primaryUrl: baseUrl,
    carouselUrls,
  };
}

export function renderPlannerAssetSvg(
  item: PlannerItem,
  slide?: number,
) {
  const isCarousel = item.format === "carousel" && item.content.carousel;
  const slideIndex = typeof slide === "number" ? slide : 0;
  const title =
    isCarousel && slideIndex > 0
      ? slideIndex > item.content.carousel!.slides.length
        ? item.cta
        : item.content.carousel!.slides[slideIndex - 1].title
      : isCarousel
        ? item.content.carousel!.coverHook
        : item.content.title;
  const body =
    isCarousel && slideIndex > 0
      ? slideIndex > item.content.carousel!.slides.length
        ? item.content.carousel!.finalSlideCta
        : item.content.carousel!.slides[slideIndex - 1].body
      : item.content.subtitle;
  const tag =
    slideIndex > 0 && isCarousel
      ? slideIndex > item.content.carousel!.slides.length
        ? "CTA FINAL"
        : `SLIDE ${slideIndex}`
      : item.format === "carousel"
        ? "CARROSSEL"
        : item.format === "reel"
          ? "REEL SCRIPT"
          : "POST UNICO";
  const titleLines = wrapText(title, 24);
  const bodyLines = wrapText(body, 34);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" fill="none">
  <defs>
    <linearGradient id="bg" x1="112" y1="78" x2="968" y2="980" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F9FBFD"/>
      <stop offset="1" stop-color="#EDF3F9"/>
    </linearGradient>
    <linearGradient id="panel" x1="96" y1="88" x2="984" y2="992" gradientUnits="userSpaceOnUse">
      <stop stop-color="white" stop-opacity="0.98"/>
      <stop offset="1" stop-color="white" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="accent" x1="854" y1="80" x2="1034" y2="270" gradientUnits="userSpaceOnUse">
      <stop stop-color="${BRAND.colors.accent}"/>
      <stop offset="1" stop-color="${BRAND.colors.primary}"/>
    </linearGradient>
    <filter id="shadow" x="40" y="42" width="1000" height="1000" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#081726" flood-opacity="0.18"/>
    </filter>
  </defs>

  <rect width="1080" height="1080" fill="#081726"/>
  <circle cx="918" cy="122" r="214" fill="${BRAND.colors.primary}" opacity="0.16"/>
  <circle cx="168" cy="980" r="220" fill="${BRAND.colors.accent}" opacity="0.14"/>
  <g filter="url(#shadow)">
    <rect x="70" y="70" width="940" height="940" rx="46" fill="url(#bg)"/>
    <rect x="96" y="96" width="888" height="888" rx="38" fill="url(#panel)"/>
  </g>

  <path d="M104 140C314 36 570 26 930 122V188C636 120 394 132 104 248V140Z" fill="url(#accent)" opacity="0.96"/>
  <rect x="792" y="180" width="146" height="44" rx="22" fill="#162A41"/>
  <text x="865" y="209" text-anchor="middle" fill="#F8FAFC" font-size="18" font-weight="700" letter-spacing="2">${escapeXml(tag)}</text>

  <text x="96" y="220" fill="#5B6B7B" font-size="24" font-weight="700" letter-spacing="6">RB SITE SOCIAL AUTOMATION</text>
  ${buildSvgTextLines(titleLines, 334, 72)}
  ${buildSvgTextLines(bodyLines, 604, 34)}

  <rect x="96" y="770" width="420" height="134" rx="28" fill="#081726"/>
  <text x="132" y="820" fill="#F8FAFC" font-size="22" font-weight="700" letter-spacing="3">MELHOR JANELA</text>
  <text x="132" y="866" fill="#F08129" font-size="38" font-weight="800" letter-spacing="-0.8">${escapeXml(item.content.bestPostingTime.toUpperCase())}</text>

  <rect x="556" y="770" width="382" height="134" rx="28" fill="#F6A55A" opacity="0.18" stroke="#F08129" stroke-opacity="0.34"/>
  <text x="592" y="820" fill="#162A41" font-size="22" font-weight="700" letter-spacing="3">CTA</text>
  <text x="592" y="866" fill="#081726" font-size="32" font-weight="800" letter-spacing="-0.8">${escapeXml(item.cta.slice(0, 28).toUpperCase())}</text>

  <text x="96" y="948" fill="#5B6B7B" font-size="24" font-weight="500">${escapeXml(BRAND.website)}</text>
  <text x="938" y="948" text-anchor="end" fill="#162A41" font-size="22" font-weight="700">${escapeXml(BRAND.whatsapp)}</text>
</svg>`.trim();
}
