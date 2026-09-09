import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { getTakkaSurface } from "@/lib/surface";

/** Auth + surface rules for customer/kitchen web app pages. */
export async function requireAppAccount(options?: {
  allowWithoutRole?: boolean;
}) {
  const headerStore = await headers();
  const surface = getTakkaSurface(headerStore.get("host"));

  if (surface === "admin") {
    redirect("/dashboard/admin");
  }

  const user = await requireAuth();

  if (!options?.allowWithoutRole && user.needsRoleSetup) {
    redirect("/role-setup");
  }

  return user;
}
