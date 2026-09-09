import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { getTakkaSurface } from "@/lib/surface";

const isAppPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/kitchens(.*)",
  "/api/health",
  "/api/discovery(.*)",
]);

const isAdminPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/api/health",
]);

export default clerkMiddleware(async (auth, req) => {
  const surface = getTakkaSurface(req.nextUrl.hostname);
  const { pathname } = req.nextUrl;

  if (surface === "admin") {
    // Admin host is control-panel only — never serve customer/kitchen UX.
    if (
      pathname === "/" ||
      pathname.startsWith("/kitchens") ||
      pathname.startsWith("/sign-up") ||
      pathname.startsWith("/role-setup") ||
      pathname.startsWith("/addresses") ||
      pathname.startsWith("/notifications") ||
      pathname.startsWith("/orders")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/dashboard/admin")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard/admin";
      return NextResponse.redirect(url);
    }

    if (!isAdminPublicRoute(req)) {
      await auth.protect();
    }

    return;
  }

  // App surface (customers + kitchens) — never serve admin panel.
  if (pathname.startsWith("/dashboard/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (!isAppPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"],
};
