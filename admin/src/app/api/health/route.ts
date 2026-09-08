import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    app: "tekka-admin",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
