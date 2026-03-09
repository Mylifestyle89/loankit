import { NextResponse } from "next/server";
import { ONLYOFFICE_URL } from "@/lib/onlyoffice/config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${ONLYOFFICE_URL}/healthcheck`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();
    const available = res.ok && text.toLowerCase().includes("true");

    return NextResponse.json({ available, url: ONLYOFFICE_URL });
  } catch {
    return NextResponse.json({ available: false, url: ONLYOFFICE_URL });
  }
}
