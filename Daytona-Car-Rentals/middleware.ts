import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("__session") ?? request.cookies.get("token");
  const returnUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/booking/")
  ) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnUrl", returnUrl);
      return NextResponse.redirect(loginUrl);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-return-url", returnUrl);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/booking/:path*"],
};
