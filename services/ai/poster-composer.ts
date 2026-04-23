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
      panelX: 54,
      panelY: 164,
      panelWidth: 610,
      panelHeight: 1470,
      heroMaxChars: 14,
      heroFontSize: 84,
      heroLineHeight: 82,
      heroStartY: 392,
      supportMaxChars: 26,
      supportFontSize: 28,
      supportLineHeight: 42,
      supportStartY: 820,
      bodyMaxChars: 28,
      bodyFontSize: 22,
      bodyLineHeight: 34,
      bodyStartY: 1014,
      footerY: 1760,
      badgeX: 860,
      badgeY: 88,
      ctaY: 1396,
      scheduleY: 1520,
      ctaWidth: 360,
      scheduleWidth: 292,
      panelAccentY: 742,
    };
  }

  return {
    width: 1080,
    height: 1080,
    panelX: 48,
    panelY: 148,
    panelWidth: 560,
    panelHeight: 768,
    heroMaxChars: 13,
    heroFontSize: 66,
    heroLineHeight: 66,
    heroStartY: 284,
    supportMaxChars: 22,
    supportFontSize: 24,
    supportLineHeight: 34,
    supportStartY: 544,
    bodyMaxChars: 28,
    bodyFontSize: 18,
    bodyLineHeight: 28,
    bodyStartY: 654,
    footerY: 986,
    badgeX: 862,
    badgeY: 70,
    ctaY: 820,
    scheduleY: 820,
    ctaWidth: 332,
    scheduleWidth: 250,
    panelAccentY: 506,
  };
}

export function buildPosterSvg(input: PosterCompositionInput) {
  const canvas = resolveCanvasSize(input.format);
  const isVertical = input.format === "reel";
  const eyebrow = input.eyebrow ?? "RB SITE SOCIAL AUTOMATION";
  const badgeLabel = input.badgeLabel ?? input.format.toUpperCase();
  const footerLeft = input.footerLeft ?? BRAND.websiteLabel;
  const footerRight = input.footerRight ?? BRAND.email;
  const heroSource = normalizeHeadline(input.artText || input.hook || input.title);
  const heroText = truncateText(heroSource, isVertical ? 50 : 38);
  const supportText = truncateText(
    normalizeHeadline(input.title !== heroText ? input.title : input.hook),
    isVertical ? 74 : 58,
  );
  const bodyText = truncateText(
    normalizeHeadline(input.subtitle !== supportText ? input.subtitle : ""),
    isVertical ? 150 : 110,
  );
  const heroLines = wrapText(heroText, canvas.heroMaxChars).slice(0, isVertical ? 4 : 3);
  const supportLines = wrapText(supportText, canvas.supportMaxChars).slice(0, 3);
  const bodyLines = wrapText(bodyText, canvas.bodyMaxChars).slice(0, isVertical ? 4 : 3);
  const ctaLines = wrapText(truncateText(input.cta.toUpperCase(), isVertical ? 24 : 18), isVertical ? 18 : 14).slice(0, 2);
  const bestTime = truncateText(input.bestPostingTime.toUpperCase(), isVertical ? 22 : 16);
  const backgroundImage = input.backgroundHref
    ? `<image href="${input.backgroundHref}" x="0" y="0" width="${canvas.width}" height="${canvas.height}" preserveAspectRatio="xMidYMid slice" filter="url(#bg-blur)" opacity="0.28" />`
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
      <stop stop-color="#07111D" stop-opacity="0.94"/>
      <stop offset="1" stop-color="#081726" stop-opacity="0.88"/>
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

  <text x="84" y="108" fill="#F8FAFC" font-family="${FONT_STACK}" font-size="20" font-weight="700" letter-spacing="5">${escapeSvg(eyebrow)}</text>
  <rect x="${canvas.badgeX}" y="${canvas.badgeY}" width="144" height="48" rx="24" fill="#FE770B"/>
  <text x="${canvas.badgeX + 72}" y="${canvas.badgeY + 31}" text-anchor="middle" fill="#081726" font-family="${FONT_STACK}" font-size="18" font-weight="900" letter-spacing="2">${escapeSvg(badgeLabel)}</text>

  ${renderTextLines({
    lines: heroLines,
    x: 92,
    startY: canvas.heroStartY,
    lineHeight: canvas.heroLineHeight,
    fontSize: canvas.heroFontSize,
    fill: "#FFFFFF",
    fontWeight: 900,
    letterSpacing: "-1.3",
  })}

  <rect x="92" y="${canvas.panelAccentY}" width="154" height="8" rx="4" fill="#FE770B"/>
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

  <g filter="url(#panel-shadow)">
    <rect x="92" y="${canvas.ctaY}" width="${canvas.ctaWidth}" height="96" rx="26" fill="#FE770B"/>
    <rect x="${canvas.panelX + canvas.panelWidth - canvas.scheduleWidth - 28}" y="${canvas.scheduleY}" width="${canvas.scheduleWidth}" height="96" rx="26" fill="#0B1827" fill-opacity="0.92" stroke="#FFFFFF" stroke-opacity="0.10"/>
  </g>
  <text x="122" y="${canvas.ctaY + 30}" fill="#081726" font-family="${FONT_STACK}" font-size="16" font-weight="800" letter-spacing="2.2">CTA</text>
  ${renderTextLines({
    lines: ctaLines,
    x: 122,
    startY: canvas.ctaY + 60,
    lineHeight: 24,
    fontSize: 22,
    fill: "#081726",
    fontWeight: 900,
    letterSpacing: "-0.4",
  })}

  <text x="${canvas.panelX + canvas.panelWidth - canvas.scheduleWidth - 2}" y="${canvas.scheduleY + 30}" fill="#FFFFFF" font-family="${FONT_STACK}" font-size="15" font-weight="800" letter-spacing="2.1">MELHOR HORARIO</text>
  <text x="${canvas.panelX + canvas.panelWidth - canvas.scheduleWidth - 2}" y="${canvas.scheduleY + 62}" fill="#F5A25A" font-family="${FONT_STACK}" font-size="20" font-weight="900" letter-spacing="-0.3">${escapeSvg(bestTime)}</text>

  <text x="84" y="${canvas.footerY}" fill="#F8FAFC" font-family="${FONT_STACK}" font-size="22" font-weight="700">${escapeSvg(footerLeft)}</text>
  <text x="${canvas.width - 84}" y="${canvas.footerY}" text-anchor="end" fill="#F8FAFC" font-family="${FONT_STACK}" font-size="20" font-weight="600">${escapeSvg(footerRight)}</text>
</svg>`.trim();
}

export function buildPosterDataUrl(input: PosterCompositionInput) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildPosterSvg(input))}`;
}
