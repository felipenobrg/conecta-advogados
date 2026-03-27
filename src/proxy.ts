import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const roleProtectedRoutes: Record<string, string[]> = {
  "/dashboard": ["LAWYER", "ADMIN"],
  "/admin": ["ADMIN"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedEntry = Object.keys(roleProtectedRoutes).find((route) => pathname.startsWith(route));
  if (!protectedEntry) {
    return NextResponse.next();
  }

  const role = request.cookies.get("app_role")?.value;
  const allowedRoles = roleProtectedRoutes[protectedEntry];

  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
