import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.method === "POST" && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/api/webhooks/sepay", request.url));
  }

  if (request.method === "POST" && request.nextUrl.pathname === "/webhooks/sepay") {
    return NextResponse.rewrite(new URL("/api/webhooks/sepay", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/webhooks/sepay"],
};
