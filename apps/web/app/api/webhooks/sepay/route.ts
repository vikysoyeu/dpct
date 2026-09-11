import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const contentType = request.headers.get("content-type") ?? "application/json";
  const authorization = request.headers.get("authorization");

  const res = await fetch(`${API_BASE}/webhooks/sepay`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body,
    cache: "no-store",
  });

  const responseText = await res.text();
  const responseContentType = res.headers.get("content-type") ?? "application/json";

  return new NextResponse(responseText, {
    status: res.status,
    headers: {
      "Content-Type": responseContentType,
    },
  });
}
