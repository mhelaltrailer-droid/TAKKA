import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getKitchenOrderPolicy } from "@/lib/kitchen-order-policy";

import { KitchenPolicyForm } from "./kitchen-policy-form";

export default async function AdminKitchenPolicyPage() {
  await requireRole(["admin"]);
  const policy = await getKitchenOrderPolicy();

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Kitchen order policy
          </p>
          <h1 className="mt-2 text-3xl font-bold">قواعد قبول الطلبات</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            المهلة وعدد مرات عدم الرد ورسالة العميل متخزنة في قاعدة البيانات.
            حالة «مشغول» ما بتنتهيش لوحدها، والرفض اليدوي مش بيتحسب في الإيقاف.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              لوحة الإدارة
            </Link>
            <Link
              href="/dashboard/admin/kitchens"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              حالة المطابخ
            </Link>
          </div>
        </header>
        <KitchenPolicyForm initial={policy} />
      </div>
    </main>
  );
}
