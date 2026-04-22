(function () {
  const FORMAT_CONFIG = {
    square: {
      id: "square",
      label: "Instagram 1:1",
      width: 1080,
      height: 1080,
      padding: 72,
      titleSize: 92,
      titleChars: 18,
      titleLines: 4,
      bodySize: 29,
      bodyChars: 31,
      bodyLines: 4,
      sideWidth: 292,
      ctaHeight: 160,
      radius: 42
    },
    portrait: {
      id: "portrait",
      label: "Feed 4:5",
      width: 1080,
      height: 1350,
      padding: 76,
      titleSize: 98,
      titleChars: 18,
      titleLines: 4,
      bodySize: 30,
      bodyChars: 30,
      bodyLines: 5,
      sideWidth: 300,
      ctaHeight: 168,
      radius: 44
    },
    story: {
      id: "story",
      label: "Story / Reels 9:16",
      width: 1080,
      height: 1920,
      padding: 80,
      titleSize: 108,
      titleChars: 14,
      titleLines: 5,
      bodySize: 34,
      bodyChars: 22,
      bodyLines: 6,
      sideWidth: 0,
      ctaHeight: 188,
      radius: 50
    }
  };

  const STYLE_CONFIG = {
    editorial: {
      shell: "#FFFFFF",
      shellOpacity: 0.9,
      bgTop: "#F7F8FB",
      bgBottom: "#EFF3F8",
      text: "#081726",
      muted: "#4C5C6B",
      accent: "#FE770B",
      accentSoft: "#FFF1E6",
      accentGlow: "#FFD5B2",
      surface: "#F8FBFF",
      surfaceStrong: "#081726",
      surfaceStrongText: "#FFFFFF",
      border: "rgba(8,23,38,0.08)",
      spotlight: "#FDF6F0"
    },
    midnight: {
      shell: "#0B1C2B",
      shellOpacity: 0.96,
      bgTop: "#06111C",
      bgBottom: "#102336",
      text: "#F7FAFC",
      muted: "#B1C2D2",
      accent: "#FE770B",
      accentSoft: "#2F1E13",
      accentGlow: "#FE770B",
      surface: "#12293E",
      surfaceStrong: "#FE770B",
      surfaceStrongText: "#081726",
      border: "rgba(255,255,255,0.08)",
      spotlight: "#172F45"
    },
    showcase: {
      shell: "#FFFDF9",
      shellOpacity: 0.94,
      bgTop: "#FFF7F0",
      bgBottom: "#F3F6FA",
      text: "#081726",
      muted: "#576676",
      accent: "#FE770B",
      accentSoft: "#081726",
      accentGlow: "#FFB87E",
      surface: "#FFFFFF",
      surfaceStrong: "#081726",
      surfaceStrongText: "#FFFFFF",
      border: "rgba(8,23,38,0.07)",
      spotlight: "#FFE5D0"
    }
  };

  function escapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function sanitizeText(value, maxLength) {
    const normalized = String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) {
      return "";
    }

    return normalized.slice(0, maxLength);
  }

  function sentenceFromContent(content) {
    const normalized = sanitizeText(content, 220);

    if (!normalized) {
      return "Sites estrategicos, SEO e performance para empresas que querem vender mais com autoridade digital.";
    }

    const parts = normalized.split(/(?<=[.!?])\s+/);
    return sanitizeText(parts[0] || normalized, 170);
  }

  function wrapText(text, maxChars, maxLines) {
    const safeText = sanitizeText(text, 240);

    if (!safeText) {
      return [];
    }

    const words = safeText.split(" ");
    const lines = [];
    let currentLine = "";

    for (const word of words) {
      const proposal = currentLine ? `${currentLine} ${word}` : word;

      if (proposal.length <= maxChars) {
        currentLine = proposal;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;

      if (lines.length === maxLines) {
        break;
      }
    }

    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }

    if (words.join(" ").length > lines.join(" ").length && lines.length) {
      const lastIndex = lines.length - 1;
      const trimmed = lines[lastIndex].slice(0, Math.max(0, maxChars - 1)).trim();
      lines[lastIndex] = trimmed.endsWith("...") ? trimmed : `${trimmed}...`;
    }

    return lines.slice(0, maxLines);
  }

  function buildTspans(lines, x, lineHeight) {
    return lines
      .map((line, index) => {
        const dy = index === 0 ? 0 : lineHeight;
        return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
      })
      .join("");
  }

  function deriveTags(payload) {
    const source = `${payload.theme} ${payload.title} ${payload.cta}`.toUpperCase();
    const words = source.match(/[A-ZÀ-ÿ0-9]{4,}/g) || [];
    const unique = [];

    for (const word of words) {
      if (!unique.includes(word)) {
        unique.push(word);
      }

      if (unique.length === 3) {
        break;
      }
    }

    return unique.length ? unique : ["WEBSITE", "SEO", "CONVERSAO"];
  }

  function slugify(value) {
    return String(value ?? "arte-rb-site")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "arte-rb-site";
  }

  function createPayload(raw = {}) {
    const format = FORMAT_CONFIG[raw.format] ? raw.format : "square";
    const style = STYLE_CONFIG[raw.style] ? raw.style : "editorial";
    const title = sanitizeText(raw.title, 110) || "Seu site pode estar afastando clientes";
    const content = sanitizeText(raw.content, 220) || "Muitas empresas perdem vendas porque o site nao transmite autoridade, clareza nem conversao.";

    return {
      format,
      style,
      eyebrow: sanitizeText(raw.eyebrow, 48) || "RB Site Social Automation",
      title,
      body: sanitizeText(raw.body, 220) || sentenceFromContent(content),
      cta: sanitizeText(raw.cta, 72) || "Fale com a RB Site",
      theme: sanitizeText(raw.theme, 56) || "Site profissional",
      footer: sanitizeText(raw.footer, 72) || "rbsite.com.br  •  Estrategia digital",
      content
    };
  }

  function renderTagPills(tags, style, originX, originY, width) {
    const pillWidth = Math.max(116, Math.floor((width - 24) / 2));
    const gap = 12;

    return tags
      .map((tag, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = originX + (pillWidth + gap) * col;
        const y = originY + row * 48;

        return `
          <rect x="${x}" y="${y}" width="${pillWidth}" height="36" rx="18" fill="${style.accentSoft}" />
          <text x="${x + 18}" y="${y + 24}" font-size="15" font-weight="700" fill="${style.accent}" letter-spacing="2">${escapeXml(tag)}</text>
        `;
      })
      .join("");
  }

  function buildSquareOrPortraitSvg(payload, formatConfig, styleConfig) {
    const { width, height, padding, titleSize, bodySize, sideWidth, ctaHeight, radius } = formatConfig;
    const leftWidth = width - (padding * 2) - sideWidth - 28;
    const shellX = 24;
    const shellY = 24;
    const shellWidth = width - 48;
    const shellHeight = height - 48;
    const sideX = width - padding - sideWidth;
    const ctaY = height - padding - ctaHeight;
    const titleY = padding + 110;
    const bodyY = titleY + (titleSize * 1.12 * Math.min(4, wrapText(payload.title, formatConfig.titleChars, formatConfig.titleLines).length)) + 30;
    const titleLines = wrapText(payload.title, formatConfig.titleChars, formatConfig.titleLines);
    const bodyLines = wrapText(payload.body, formatConfig.bodyChars, formatConfig.bodyLines);
    const tags = deriveTags(payload);
    const footerY = shellY + shellHeight - 34;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(payload.title)}">
  <defs>
    <linearGradient id="bg-${payload.style}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${styleConfig.bgTop}" />
      <stop offset="100%" stop-color="${styleConfig.bgBottom}" />
    </linearGradient>
    <radialGradient id="glow-orange-${payload.style}" cx="78%" cy="12%" r="42%">
      <stop offset="0%" stop-color="${styleConfig.accentGlow}" stop-opacity="0.58" />
      <stop offset="100%" stop-color="${styleConfig.accentGlow}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glow-soft-${payload.style}" cx="12%" cy="88%" r="38%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg-${payload.style})" />
  <circle cx="${width - 110}" cy="120" r="${Math.round(width * 0.24)}" fill="url(#glow-orange-${payload.style})" />
  <circle cx="110" cy="${height - 120}" r="${Math.round(width * 0.22)}" fill="url(#glow-soft-${payload.style})" />

  <rect x="${shellX}" y="${shellY}" width="${shellWidth}" height="${shellHeight}" rx="${radius}" fill="${styleConfig.shell}" fill-opacity="${styleConfig.shellOpacity}" stroke="${styleConfig.border}" />
  <rect x="${padding}" y="${padding}" width="${leftWidth}" height="${height - padding * 2 - ctaHeight - 24}" rx="${Math.round(radius - 12)}" fill="none" />
  <rect x="${sideX}" y="${padding}" width="${sideWidth}" height="${226}" rx="30" fill="${styleConfig.spotlight}" stroke="${styleConfig.border}" />
  <rect x="${sideX}" y="${padding + 244}" width="${sideWidth}" height="${178}" rx="28" fill="${styleConfig.surface}" stroke="${styleConfig.border}" />
  <rect x="${padding}" y="${ctaY}" width="${width - (padding * 2)}" height="${ctaHeight}" rx="34" fill="${styleConfig.surfaceStrong}" />

  <text x="${padding}" y="${padding + 26}" font-size="18" font-weight="700" fill="${styleConfig.accent}" letter-spacing="4">${escapeXml(payload.eyebrow.toUpperCase())}</text>

  <text x="${padding}" y="${titleY}" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="700" fill="${styleConfig.text}">
    ${buildTspans(titleLines, padding, Math.round(titleSize * 1.1))}
  </text>

  <text x="${padding}" y="${bodyY}" font-family="Arial, Helvetica, sans-serif" font-size="${bodySize}" font-weight="500" fill="${styleConfig.muted}">
    ${buildTspans(bodyLines, padding, Math.round(bodySize * 1.62))}
  </text>

  <text x="${sideX + 28}" y="${padding + 48}" font-size="16" font-weight="700" fill="${styleConfig.accent}" letter-spacing="3">DIRECAO</text>
  <text x="${sideX + 28}" y="${padding + 98}" font-size="34" font-weight="700" fill="${styleConfig.text}">${escapeXml(payload.theme)}</text>
  <text x="${sideX + 28}" y="${padding + 140}" font-size="18" font-weight="500" fill="${styleConfig.muted}">Post premium para redes sociais com composicao limpa, forte e comercial.</text>

  ${renderTagPills(tags, styleConfig, sideX + 24, padding + 272, sideWidth - 48)}

  <text x="${padding + 32}" y="${ctaY + 52}" font-size="18" font-weight="700" fill="${styleConfig.surfaceStrongText}" letter-spacing="3">CTA</text>
  <text x="${padding + 32}" y="${ctaY + 104}" font-size="42" font-weight="700" fill="${styleConfig.surfaceStrongText}">${escapeXml(payload.cta)}</text>
  <text x="${padding + 32}" y="${ctaY + 138}" font-size="20" font-weight="500" fill="${styleConfig.surfaceStrongText}" opacity="0.82">${escapeXml(payload.footer)}</text>

  <rect x="${width - padding - 190}" y="${ctaY + 34}" width="158" height="92" rx="26" fill="${styleConfig.accent}" />
  <text x="${width - padding - 158}" y="${ctaY + 70}" font-size="18" font-weight="700" fill="${styleConfig.surfaceStrongText}" letter-spacing="3">FORMATO</text>
  <text x="${width - padding - 158}" y="${ctaY + 110}" font-size="28" font-weight="700" fill="${styleConfig.surfaceStrongText}">${escapeXml(formatConfig.label)}</text>

  <text x="${width - padding - 16}" y="${footerY}" font-size="15" font-weight="600" fill="${styleConfig.muted}" text-anchor="end">${escapeXml(payload.footer.toUpperCase())}</text>
</svg>`;
  }

  function buildStorySvg(payload, formatConfig, styleConfig) {
    const { width, height, padding, titleSize, bodySize, ctaHeight, radius } = formatConfig;
    const titleLines = wrapText(payload.title, formatConfig.titleChars, formatConfig.titleLines);
    const bodyLines = wrapText(payload.body, formatConfig.bodyChars, formatConfig.bodyLines);
    const tags = deriveTags(payload);
    const titleY = padding + 148;
    const bodyY = titleY + (titleSize * 1.08 * Math.min(5, titleLines.length)) + 44;
    const infoY = bodyY + (bodySize * 1.58 * Math.min(6, bodyLines.length)) + 54;
    const ctaY = height - padding - ctaHeight;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(payload.title)}">
  <defs>
    <linearGradient id="bg-story-${payload.style}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${styleConfig.bgTop}" />
      <stop offset="100%" stop-color="${styleConfig.bgBottom}" />
    </linearGradient>
    <radialGradient id="glow-story-a-${payload.style}" cx="80%" cy="10%" r="38%">
      <stop offset="0%" stop-color="${styleConfig.accentGlow}" stop-opacity="0.72" />
      <stop offset="100%" stop-color="${styleConfig.accentGlow}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glow-story-b-${payload.style}" cx="12%" cy="84%" r="36%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg-story-${payload.style})" />
  <circle cx="${width - 110}" cy="140" r="300" fill="url(#glow-story-a-${payload.style})" />
  <circle cx="110" cy="${height - 170}" r="260" fill="url(#glow-story-b-${payload.style})" />

  <rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="${radius}" fill="${styleConfig.shell}" fill-opacity="${styleConfig.shellOpacity}" stroke="${styleConfig.border}" />
  <rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${height - padding * 2 - ctaHeight - 36}" rx="44" fill="none" />
  <rect x="${padding}" y="${infoY}" width="${width - padding * 2}" height="254" rx="34" fill="${styleConfig.spotlight}" stroke="${styleConfig.border}" />
  <rect x="${padding}" y="${ctaY}" width="${width - padding * 2}" height="${ctaHeight}" rx="38" fill="${styleConfig.surfaceStrong}" />

  <text x="${padding}" y="${padding + 28}" font-size="20" font-weight="700" fill="${styleConfig.accent}" letter-spacing="5">${escapeXml(payload.eyebrow.toUpperCase())}</text>
  <text x="${padding}" y="${titleY}" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="700" fill="${styleConfig.text}">
    ${buildTspans(titleLines, padding, Math.round(titleSize * 1.08))}
  </text>

  <text x="${padding}" y="${bodyY}" font-family="Arial, Helvetica, sans-serif" font-size="${bodySize}" font-weight="500" fill="${styleConfig.muted}">
    ${buildTspans(bodyLines, padding, Math.round(bodySize * 1.55))}
  </text>

  <text x="${padding + 36}" y="${infoY + 58}" font-size="18" font-weight="700" fill="${styleConfig.accent}" letter-spacing="3">POSICIONAMENTO</text>
  <text x="${padding + 36}" y="${infoY + 118}" font-size="40" font-weight="700" fill="${styleConfig.text}">${escapeXml(payload.theme)}</text>
  <text x="${padding + 36}" y="${infoY + 164}" font-size="22" font-weight="500" fill="${styleConfig.muted}">Visual clean, contraste forte e cara de software premium para anuncio, feed ou story.</text>

  ${renderTagPills(tags, styleConfig, padding + 34, infoY + 192, width - padding * 2 - 68)}

  <text x="${padding + 36}" y="${ctaY + 60}" font-size="18" font-weight="700" fill="${styleConfig.surfaceStrongText}" letter-spacing="3">CTA</text>
  <text x="${padding + 36}" y="${ctaY + 118}" font-size="48" font-weight="700" fill="${styleConfig.surfaceStrongText}">${escapeXml(payload.cta)}</text>
  <text x="${padding + 36}" y="${ctaY + 156}" font-size="22" font-weight="500" fill="${styleConfig.surfaceStrongText}" opacity="0.82">${escapeXml(payload.footer)}</text>
</svg>`;
  }

  function buildSvg(raw) {
    const payload = createPayload(raw);
    const formatConfig = FORMAT_CONFIG[payload.format];
    const styleConfig = STYLE_CONFIG[payload.style];

    if (payload.format === "story") {
      return {
        payload,
        formatConfig,
        svg: buildStorySvg(payload, formatConfig, styleConfig)
      };
    }

    return {
      payload,
      formatConfig,
      svg: buildSquareOrPortraitSvg(payload, formatConfig, styleConfig)
    };
  }

  function svgToDataUrl(svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function downloadBlob(blob, fileName) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function updatePreview(rendered) {
    const image = document.getElementById("art-preview-image");
    const stage = document.getElementById("art-preview-stage");
    const dimensions = document.getElementById("art-dimensions");

    if (!image || !stage || !dimensions) {
      return;
    }

    image.src = svgToDataUrl(rendered.svg);
    image.dataset.fileName = slugify(rendered.payload.title);
    stage.style.aspectRatio = `${rendered.formatConfig.width} / ${rendered.formatConfig.height}`;
    dimensions.textContent = `${rendered.formatConfig.width} x ${rendered.formatConfig.height}`;
  }

  function render(raw) {
    const rendered = buildSvg(raw);
    updatePreview(rendered);
    return rendered;
  }

  async function downloadPng(raw) {
    const rendered = buildSvg(raw);
    const blob = new Blob([rendered.svg], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = rendered.formatConfig.width;
    canvas.height = rendered.formatConfig.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);

    const pngBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png", 1);
    });

    URL.revokeObjectURL(objectUrl);

    if (!pngBlob) {
      throw new Error("Nao foi possivel exportar PNG.");
    }

    downloadBlob(pngBlob, `${slugify(rendered.payload.title)}-${rendered.payload.format}.png`);
    return rendered;
  }

  function downloadSvg(raw) {
    const rendered = buildSvg(raw);
    const svgBlob = new Blob([rendered.svg], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(svgBlob, `${slugify(rendered.payload.title)}-${rendered.payload.format}.svg`);
    return rendered;
  }

  window.RBSiteArtGenerator = {
    render,
    downloadPng,
    downloadSvg,
    getFormatConfig(format) {
      return FORMAT_CONFIG[format] || FORMAT_CONFIG.square;
    },
    createPayload
  };
})();
