import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { getTakkaSurface } from "@/lib/surface";

const isAppPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/kitchens(.*)",
  "/deals(.*)",
  "/join-kitchen(.*)",
  "/api/health",
  "/api/discovery(.*)",
  "/api/join-kitchen(.*)",
  "/api/mobile(.*)",
  // Presign authenticates inside the route (cookie session or Bearer token).
  "/api/uploads/presign",
]);

const isAdminPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/api/health",
  // Public catalog used by mobile guest browse (and web).
  "/api/discovery(.*)",
  "/api/mobile(.*)",
  "/api/uploads/presign",
]);

export default clerkMiddleware(async (auth, req) => {
  const surface = getTakkaSurface(req.nextUrl.hostname);
  const { pathname } = req.nextUrl;

  // Presign authenticates with a cookie session or a Bearer token inside the route.
  if (pathname === "/api/uploads/presign") {
    return;
  }

  // Mobile APIs authenticate with Bearer session tokens inside the route.
  if (pathname.startsWith("/api/mobile")) {
    return;
  }

  if (surface === "admin") {
    // Admin host is control-panel only — never serve customer/kitchen UX.
    if (
      pathname === "/" ||
      pathname.startsWith("/kitchens") ||
      pathname.startsWith("/deals") ||
      pathname.startsWith("/join-kitchen") ||
      pathname.startsWith("/sign-up") ||
      pathname.startsWith("/role-setup") ||
      pathname.startsWith("/addresses") ||
      pathname.startsWith("/notifications") ||
      pathname.startsWith("/orders") ||
      pathname.startsWith("/cart")
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
