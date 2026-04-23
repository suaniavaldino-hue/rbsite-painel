import "server-only";

import { BRAND } from "@/lib/constants/brand";
import type { ContentFormat } from "@/types/content-generation";

type PosterCompositionInput = {
  format: ContentFormat;
  title: string;
  subtitle: string;
  hook: string;
  artText: string;
  cta: string;
  bestPostingTime: string;
  backgroundHref?: string;
  eyebrow?: string;
  badgeLabel?: string;
  footerLeft?: string;
  footerRight?: string;
};

const FONT_STACK = "Segoe UI, Arial, Helvetica, sans-serif";

export function escapeSvg(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function wrapText(text: string, maxChars: number) {
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

  return lines;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function normalizeHeadline(value: string) {
  return value
    .replace(/[.:;!?]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function renderTextLines(input: {
  lines: string[];
  x: number;
  startY: number;
  lineHeight: number;
  fontSize: number;
  fill: string;
  fontWeight: number;
  letterSpacing?: string;
  opacity?: number;
}) {
  return input.lines
    .map((line, index) => {
      const y = input.startY + index * input.lineHeight;
      return `<text x="${input.x}" y="${y}" fill="${input.fill}" fill-opacity="${input.opacity ?? 1}" font-family="${FONT_STACK}" font-size="${input.fontSize}" font-weight="${input.fontWeight}" letter-spacing="${input.letterSpacing ?? "0"}">${escapeSvg(line)}</text>`;
    })
    .join("");
}

export function resolveCanvasSize(format: ContentFormat) {
  if (format === "reel") {
    return {
      width: 1080,
      height: 1920,
      panelX: 60,
      panelY: 184,
      panelWidth: 600,
      panelHeight: 1180,
      heroMaxChars: 16,
      heroFontSize: 72,
      heroLineHeight: 74,
      heroStartY: 360,
      supportMaxChars: 26,
      supportFontSize: 28,
      supportLineHeight: 42,
      supportStartY: 724,
      bodyMaxChars: 28,
      bodyFontSize: 22,
      bodyLineHeight: 34,
      bodyStartY: 928,
      footerY: 1760,
      panelAccentY: 662,
    };
  }

  return {
    width: 1080,
    height: 1080,
    panelX: 54,
    panelY: 154,
    panelWidth: 546,
    panelHeight: 650,
    heroMaxChars: 15,
    heroFontSize: 56,
    heroLineHeight: 58,
    heroStartY: 270,
    supportMaxChars: 24,
    supportFontSize: 22,
    supportLineHeight: 32,
    supportStartY: 500,
    bodyMaxChars: 28,
    bodyFontSize: 18,
    bodyLineHeight: 28,
    bodyStartY: 610,
    footerY: 986,
    panelAccentY: 464,
  };
}

export function buildPosterSvg(input: PosterCompositionInput) {
  const canvas = resolveCanvasSize(input.format);
  const isVertical = input.format === "reel";
  const footerLeft = input.footerLeft ?? BRAND.websiteLabel;
  const footerRight = input.footerRight ?? BRAND.email;
  const heroSource = normalizeHeadline(input.artText || input.hook || input.title);
  const heroText = truncateText(heroSource, isVertical ? 54 : 34);
  const supportText = truncateText(
    normalizeHeadline(input.title !== heroText ? input.title : input.hook),
    isVertical ? 74 : 50,
  );
  const bodyText = truncateText(
    normalizeHeadline(input.subtitle !== supportText ? input.subtitle : ""),
    isVertical ? 140 : 96,
  );
  const heroLines = wrapText(heroText, canvas.heroMaxChars).slice(0, isVertical ? 4 : 3);
  const supportLines = wrapText(supportText, canvas.supportMaxChars).slice(0, 3);
  const bodyLines = wrapText(bodyText, canvas.bodyMaxChars).slice(0, isVertical ? 4 : 3);
  const backgroundImage = input.backgroundHref
    ? `<image href="${input.backgroundHref}" x="0" y="0" width="${canvas.width}" height="${canvas.height}" preserveAspectRatio="xMidYMid slice" filter="url(#bg-blur)" opacity="0.24" />`
    : "";

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" fill="none">
  <defs>
    <linearGradient id="bg-base" x1="60" y1="70" x2="${canvas.width - 40}" y2="${canvas.height - 50}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#081726"/>
      <stop offset="0.55" stop-color="#10243A"/>
      <stop offset="1" stop-color="#060D16"/>
    </linearGradient>
    <linearGradient id="overlay" x1="0" y1="0" x2="${canvas.width}" y2="${canvas.height}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#03060B" stop-opacity="0.92"/>
      <stop offset="0.38" stop-color="#081726" stop-opacity="0.76"/>
      <stop offset="1" stop-color="#081726" stop-opacity="0.82"/>
    </linearGradient>
    <linearGradient id="panel" x1="${canvas.panelX}" y1="${canvas.panelY}" x2="${canvas.panelX + canvas.panelWidth}" y2="${canvas.panelY + canvas.panelHeight}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#07111D" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#081726" stop-opacity="0.90"/>
    </linearGradient>
    <linearGradient id="accent-wave" x1="70" y1="${canvas.height - 250}" x2="${canvas.width - 40}" y2="${canvas.height - 90}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FE770B"/>
      <stop offset="0.52" stop-color="#F5A25A"/>
      <stop offset="1" stop-color="#4BC1FF"/>
    </linearGradient>
    <filter id="panel-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="28" flood-color="#02050B" flood-opacity="0.52"/>
    </filter>
    <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="36"/>
    </filter>
    <filter id="bg-blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>

  <rect width="${canvas.width}" height="${canvas.height}" fill="url(#bg-base)"/>
  ${backgroundImage}
  <rect width="${canvas.width}" height="${canvas.height}" fill="url(#overlay)"/>

  <ellipse cx="${canvas.width - 120}" cy="${isVertical ? 260 : 200}" rx="260" ry="220" fill="#FE770B" fill-opacity="0.14" filter="url(#soft-glow)"/>
  <ellipse cx="${Math.round(canvas.width * 0.78)}" cy="${Math.round(canvas.height * 0.72)}" rx="260" ry="190" fill="#4BC1FF" fill-opacity="0.09" filter="url(#soft-glow)"/>
  <ellipse cx="${Math.round(canvas.width * 0.24)}" cy="${canvas.height - 90}" rx="320" ry="160" fill="#FE770B" fill-opacity="0.08" filter="url(#soft-glow)"/>

  <path d="M44 ${canvas.height - 182}C180 ${canvas.height - 246} 362 ${canvas.height - 46} 572 ${canvas.height - 116}C742 ${canvas.height - 172} 858 ${canvas.height - 258} ${canvas.width - 26} ${canvas.height - 164}" stroke="url(#accent-wave)" stroke-width="12" stroke-linecap="round" opacity="0.94"/>
  <path d="M56 ${canvas.height - 128}C206 ${canvas.height - 206} 394 ${canvas.height - 12} 640 ${canvas.height - 86}C814 ${canvas.height - 138} 936 ${canvas.height - 188} ${canvas.width - 36} ${canvas.height - 126}" stroke="#81E6FF" stroke-width="6" stroke-linecap="round" opacity="0.68"/>

  <g filter="url(#panel-shadow)">
    <rect x="${canvas.panelX}" y="${canvas.panelY}" width="${canvas.panelWidth}" height="${canvas.panelHeight}" rx="38" fill="url(#panel)" stroke="#FFFFFF" stroke-opacity="0.08"/>
  </g>

  ${renderTextLines({
    lines: heroLines,
    x: 92,
    startY: canvas.heroStartY,
    lineHeight: canvas.heroLineHeight,
    fontSize: canvas.heroFontSize,
    fill: "#FFFFFF",
    fontWeight: 900,
    letterSpacing: "-1.1",
  })}

  <rect x="92" y="${canvas.panelAccentY}" width="132" height="8" rx="4" fill="#FE770B"/>
  ${renderTextLines({
    lines: supportLines,
    x: 92,
    startY: canvas.supportStartY,
    lineHeight: canvas.supportLineHeight,
    fontSize: canvas.supportFontSize,
    fill: "#F8FAFC",
    fontWeight: 700,
    letterSpacing: "0.1",
    opacity: 0.96,
  })}

  ${renderTextLines({
    lines: bodyLines,
    x: 92,
    startY: canvas.bodyStartY,
    lineHeight: canvas.bodyLineHeight,
    fontSize: canvas.bodyFontSize,
    fill: "#D8E4F0",
    fontWeight: 500,
    letterSpacing: "0",
    opacity: 0.9,
  })}

  <text x="84" y="${canvas.footerY}" fill="#F8FAFC" font-family="${FONT_STACK}" font-size="22" font-weight="700">${escapeSvg(footerLeft)}</text>
  <text x="${canvas.width - 84}" y="${canvas.footerY}" text-anchor="end" fill="#F8FAFC" font-family="${FONT_STACK}" font-size="20" font-weight="600">${escapeSvg(footerRight)}</text>
</svg>`.trim();
}

export function buildPosterDataUrl(input: PosterCompositionInput) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildPosterSvg(input))}`;
}
