export type TakkaSurface = "admin" | "app";

export function getTakkaSurface(hostname?: string | null): TakkaSurface {
  const configured = process.env.NEXT_PUBLIC_TAKKA_SURFACE?.trim();

  if (configured === "admin" || configured === "app") {
    return configured;
  }

  const host = (hostname ?? "").toLowerCase();

  if (host.includes("takka-app")) {
    return "app";
  }

  if (host.includes("takka-admin")) {
    return "admin";
  }

  // Keep the existing Render service admin-safe by default.
  return "admin";
}

export function isAppSurface(hostname?: string | null) {
  return getTakkaSurface(hostname) === "app";
}

export function isAdminSurface(hostname?: string | null) {
  return getTakkaSurface(hostname) === "admin";
}
