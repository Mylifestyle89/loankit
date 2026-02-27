import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", message: "API is running" });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
