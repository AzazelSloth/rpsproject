import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/login", "/signup", "/forgot-password", "/survey-response"];

function isLocalBypassAllowed(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_BACKEND_MODE === "mock" &&
    isLocalHost
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js)$/)
  ) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get("auth_token")?.value;
  if (authToken) {
    return NextResponse.next();
  }

  if (isLocalBypassAllowed(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
