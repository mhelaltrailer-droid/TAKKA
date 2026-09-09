"use client";

import { useClerk } from "@clerk/nextjs";

export function AccountSignOutButton() {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      onClick={() => void signOut({ redirectUrl: "/" })}
      className="flex w-full items-center gap-3 rounded-2xl border border-[#ead9c8] bg-white px-3 py-3 text-right transition hover:border-red-300"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffebee] text-lg">
        🚪
      </span>
      <span className="flex-1 font-bold text-[#c62828]">تسجيل الخروج</span>
    </button>
  );
}
