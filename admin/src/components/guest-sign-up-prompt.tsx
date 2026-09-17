"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

/** Shared guest gate: browse-only users must register as customer to continue. */
export function GuestSignUpPrompt({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-signup-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-[#ead9c8] bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <p
          id="guest-signup-title"
          className="text-lg font-semibold text-[#3b2418]"
        >
          قم بالتسجيل أولا
        </p>
        <p className="mt-2 text-sm leading-7 text-[#6b4a3a]">
          التصفح متاح للزائر. لإكمال هذه الخطوة سجّل كعميل.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
          >
            إغلاق
          </button>
          <Link
            href="/sign-up"
            className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            سجل الآن
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Link that opens guest prompt when unsigned instead of navigating. */
export function GuestAwareLink({
  href,
  isSignedIn,
  className,
  children,
}: {
  href: string;
  isSignedIn: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (isSignedIn) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <GuestSignUpPrompt open={open} onClose={() => setOpen(false)} />
    </>
  );
}
