import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    app: "RB Site Social Automation",
    stage: "foundation-multi-ai",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
