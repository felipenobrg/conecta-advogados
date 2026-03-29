import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const roleProtectedRoutes: Record<string, string[]> = {
  "/dashboard": ["LAWYER", "ADMIN"],
  "/admin": ["ADMIN"],
  "/leads": ["LAWYER", "ADMIN"],
  "/conta": ["LAWYER", "ADMIN"],
};

function hasAuthSession(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && (cookie.name.includes("auth-token") || cookie.name.includes("access-token")) && Boolean(cookie.value));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/client/dashboard")) {
    return NextResponse.redirect(new URL("/leads/inscricao", request.url));
  }

  if (pathname.startsWith("/leads/inscricao")) {
    return NextResponse.next();
  }

  const protectedEntry = Object.keys(roleProtectedRoutes).find((route) => pathname.startsWith(route));
  if (!protectedEntry) {
    return NextResponse.next();
  }

  if (!hasAuthSession(request)) {
    const authUrl = new URL("/auth", request.url);
    authUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(authUrl);
  }

  const role = request.cookies.get("app_role")?.value;
  const allowedRoles = roleProtectedRoutes[protectedEntry];

  if (!role || !allowedRoles.includes(role)) {
    const authUrl = new URL("/auth", request.url);
    authUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/leads/:path*", "/conta/:path*", "/client/dashboard/:path*"],
};
