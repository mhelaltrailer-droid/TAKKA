"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AppRoleChoice = "customer" | "kitchen_owner";

export function RoleSetupForm({
  initialRole = "customer",
}: {
  initialRole?: AppRoleChoice;
}) {
  const router = useRouter();
  const [role, setRole] = useState<AppRoleChoice>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveRole() {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/mobile/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "تعذر حفظ الدور.");
      }

      router.push(role === "kitchen_owner" ? "/dashboard" : "/kitchens");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الدور.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <RoleCard
        title="عميل"
        description="استعرض المطابخ، اطلب الطعام، وتابع الطلب حتى الاستلام."
        selected={role === "customer"}
        onClick={() => setRole("customer")}
      />
      <RoleCard
        title="مطبخ"
        description="أضف بيانات المطبخ، أدِر المنيو، واستقبل الطلبات من نفس التطبيق."
        selected={role === "kitchen_owner"}
        onClick={() => setRole("kitchen_owner")}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={saveRole}
        disabled={isSaving}
        className="w-full bg-[var(--brand-primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-60"
      >
        {isSaving ? "جارٍ الحفظ..." : "تأكيد ومتابعة"}
      </button>
    </div>
  );
}

function RoleCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-3xl border p-5 text-right transition ${
        selected
          ? "border-[var(--brand-primary)] bg-orange-50"
          : "border-[#ead9c8] bg-white"
      }`}
    >
      <p className="text-lg font-bold">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[#6b4a3a]">{description}</p>
    </button>
  );
}
