"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteAdminManagedUser,
  toggleAdminManagedUserActive,
  type AdminUserActionResult,
} from "./actions";

type UserRowActionsProps = {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
  hasLinkedData: boolean;
};

export function UserRowActions({
  userId,
  isActive,
  isSelf,
  hasLinkedData,
}: UserRowActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function run(
    action: (id: string) => Promise<AdminUserActionResult>,
    confirmText?: string,
  ) {
    if (isSelf) {
      setIsError(true);
      setMessage("لا يمكن تنفيذ هذا الإجراء على حسابك.");
      return;
    }
    if (confirmText && !window.confirm(confirmText)) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await action(userId);
      if (!result.ok) {
        setIsError(true);
        setMessage(result.error || "فشل التنفيذ.");
        return;
      }
      setIsError(false);
      setMessage(result.message || "تم تنفيذ العملية بنجاح.");
      router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || isSelf}
          onClick={() =>
            run(
              toggleAdminManagedUserActive,
              isActive
                ? "تعطيل هذا الحساب؟ لن يستطيع تسجيل الدخول."
                : "تفعيل هذا الحساب؟",
            )
          }
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "جارٍ..." : isActive ? "تعطيل" : "تفعيل"}
        </button>
        <button
          type="button"
          disabled={pending || isSelf}
          onClick={() =>
            run(
              deleteAdminManagedUser,
              hasLinkedData
                ? "هذا الحساب مرتبط بمطبخ أو طلبات. سيتم تعطيله بدل الحذف النهائي. متابعة؟"
                : "حذف هذا الحساب نهائياً؟ لا يمكن التراجع.",
            )
          }
          className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
        >
          {pending ? "جارٍ..." : "حذف"}
        </button>
      </div>
      {message ? (
        <p
          className={`text-sm ${isError ? "text-red-600" : "text-emerald-700"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
