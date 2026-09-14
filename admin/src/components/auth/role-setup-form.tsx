"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ROLE_SWITCH_COPY } from "@/lib/role-switch-copy";

type AppRoleChoice = "customer" | "kitchen_owner";

export function RoleSetupForm({
  initialRole = "customer",
  hasKitchen = false,
  allowFirstTimeChoice = false,
}: {
  initialRole?: AppRoleChoice;
  hasKitchen?: boolean;
  /** New accounts with no role yet may pick either path. */
  allowFirstTimeChoice?: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<AppRoleChoice>(
    allowFirstTimeChoice
      ? initialRole
      : hasKitchen
        ? initialRole
        : initialRole === "kitchen_owner"
          ? "customer"
          : initialRole,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Existing customer without kitchen → onboarding, not bare role flip.
  if (!allowFirstTimeChoice && initialRole === "customer" && !hasKitchen) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-bold text-[#4a2e22]">
          {ROLE_SWITCH_COPY.customerAccountTitle}
        </p>
        <p className="text-sm leading-7 text-[#6b4a3a]">
          {ROLE_SWITCH_COPY.customerAccountBody}
        </p>
        <Link
          href={ROLE_SWITCH_COPY.kitchenOnboardingPath}
          className="inline-flex w-full items-center justify-center bg-[var(--brand-primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--brand-secondary)]"
        >
          {ROLE_SWITCH_COPY.becomeKitchenCta}
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex w-full items-center justify-center border border-[#ead9c8] bg-white px-4 py-3 text-sm font-semibold text-[#4a2e22]"
        >
          البقاء كعميل
        </Link>
      </div>
    );
  }

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
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
          onboardingPath?: string;
        } | null;

        if (payload?.error === "NEEDS_KITCHEN_ONBOARDING") {
          router.push(
            payload.onboardingPath ?? ROLE_SWITCH_COPY.kitchenOnboardingPath,
          );
          return;
        }

        throw new Error(
          payload?.message || payload?.error || "تعذر حفظ الدور.",
        );
      }

      router.push(role === "kitchen_owner" ? "/dashboard" : "/kitchens");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الدور.");
    } finally {
      setIsSaving(false);
    }
  }

  const showCustomerOption = true;
  const showKitchenOption = allowFirstTimeChoice || hasKitchen;

  return (
    <div className="space-y-4">
      {showCustomerOption ? (
        <RoleCard
          title="عميل"
          description="استعرض المطابخ، اطلب الطعام، وتابع الطلب حتى الاستلام."
          selected={role === "customer"}
          onClick={() => setRole("customer")}
        />
      ) : null}
      {showKitchenOption ? (
        <RoleCard
          title="مطبخ"
          description={
            hasKitchen
              ? "العودة لإدارة مطبخك والطلبات من نفس الحساب."
              : "أضف بيانات المطبخ، أدِر المنيو، واستقبل الطلبات من نفس التطبيق."
          }
          selected={role === "kitchen_owner"}
          onClick={() => setRole("kitchen_owner")}
        />
      ) : null}
      {!hasKitchen && initialRole === "kitchen_owner" ? (
        <Link
          href={ROLE_SWITCH_COPY.kitchenOnboardingPath}
          className="inline-flex w-full items-center justify-center border border-[#ead9c8] bg-white px-4 py-3 text-sm font-semibold text-[#4a2e22]"
        >
          {ROLE_SWITCH_COPY.becomeKitchenCta}
        </Link>
      ) : null}
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
