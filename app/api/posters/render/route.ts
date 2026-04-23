import { NextResponse } from "next/server";

import {
  buildPosterSvg,
  parsePosterPayload,
} from "@/services/ai/poster-composer";

export const runtime = "nodejs";

async function resolveBackgroundHref(backgroundHref?: string) {
  if (!backgroundHref || !/^https?:\/\//i.test(backgroundHref)) {
    return undefined;
  }

  try {
    const response = await fetch(backgroundHref, {
      headers: {
        Accept: "image/*",
      },
      next: {
        revalidate: 60 * 60 * 24,
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return undefined;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = url.searchParams.get("payload");

  if (!payload) {
    return new NextResponse("Missing poster payload.", { status: 400 });
  }

  try {
    const poster = parsePosterPayload(payload);
    const hydratedBackgroundHref = await resolveBackgroundHref(
      poster.backgroundHref,
    );
    const svg = buildPosterSvg({
      ...poster,
      backgroundHref: hydratedBackgroundHref,
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Content-Security-Policy":
          "default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new NextResponse("Invalid poster payload.", { status: 400 });
  }
}
