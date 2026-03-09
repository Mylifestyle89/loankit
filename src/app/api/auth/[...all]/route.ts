import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const handler = toNextJsHandler(auth);

export async function GET(req: NextRequest) {
  try {
    return await handler.GET(req);
  } catch (err) {
    console.error("[AUTH GET ERROR]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handler.POST(req);
  } catch (err) {
    console.error("[AUTH POST ERROR]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
