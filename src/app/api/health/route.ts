import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "KAU-FPO Platform",
    version: "0.1.0",
  });
}
