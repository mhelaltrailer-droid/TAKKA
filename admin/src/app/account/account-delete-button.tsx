"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

export function AccountDeleteButton() {
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "تعذر حذف الحساب.");
      }
      await signOut({ redirectUrl: "/" });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "تعذر حذف الحساب.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-white px-3 py-3 text-right transition hover:border-red-400"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffebee] text-lg">
          🗑️
        </span>
        <span className="flex-1 font-bold text-[#c62828]">حذف حسابي</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-5 shadow-sm"
          >
            <h2
              id="delete-account-title"
              className="text-lg font-bold text-[#3b2418]"
            >
              هل أنت متأكد من حذف حسابك
            </h2>
            <p className="text-sm leading-6 text-[#6b4a3a]">
              سيتم حذف الحساب نهائيًا ولن تتمكن من استرجاعه. إذا كان لديك مطبخ
              فسيُغلق ويختفي من الاكتشاف.
            </p>
            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="flex-1 rounded-2xl border border-[#ead9c8] px-4 py-3 text-sm font-bold text-[#3b2418]"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmDelete()}
                className="flex-1 rounded-2xl bg-[#c62828] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "جارٍ الحذف..." : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
