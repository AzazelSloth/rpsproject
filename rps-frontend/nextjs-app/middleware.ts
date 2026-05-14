import { NextRequest, NextResponse } from "next/server";

const DEMO_AUTH_TOKEN = "auth-disabled";
const publicRoutes = ["/login", "/signup", "/forgot-password", "/survey-response"];

function isPublicRoute(pathname: string) {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isMockBackendEnabled() {
  return process.env.NEXT_PUBLIC_BACKEND_MODE?.trim().toLowerCase() === "mock";
}

function redirectToLogin(request: NextRequest, shouldClearSession: boolean) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "redirect",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  const response = NextResponse.redirect(loginUrl);

  if (shouldClearSession) {
    response.cookies.set("auth_token", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
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

  const authToken = request.cookies.get("auth_token")?.value?.trim();
  const isDemoToken = authToken === DEMO_AUTH_TOKEN;

  if (authToken && (!isDemoToken || isMockBackendEnabled())) {
    return NextResponse.next();
  }

  return redirectToLogin(request, Boolean(authToken));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
