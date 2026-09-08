import { requireRole } from "@/lib/auth";

export default async function KitchenOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["kitchen_owner", "admin"]);

  return children;
}
