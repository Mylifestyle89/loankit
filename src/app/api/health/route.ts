import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness probe for Docker healthcheck + external monitoring.
 * Returns 200 with build info — no auth required (intentionally public).
 * Does NOT touch DB to keep probe fast and decoupled from data layer.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "loankit",
      version: process.env.npm_package_version ?? "unknown",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
