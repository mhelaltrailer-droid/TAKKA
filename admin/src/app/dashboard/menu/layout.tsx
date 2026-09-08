import { requireRole } from "@/lib/auth";

export default async function KitchenMenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["kitchen_owner", "admin"]);

  return children;
}
