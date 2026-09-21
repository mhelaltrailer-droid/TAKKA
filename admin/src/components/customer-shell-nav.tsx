"use client";

import Link from "next/link";

import { GuestAwareLink } from "@/components/guest-sign-up-prompt";

const PUBLIC_HREFS = new Set(["/kitchens", "/deals"]);

export function CustomerTopNav({
  links,
  isSignedIn,
}: {
  links: ReadonlyArray<{ href: string; label: string }>;
  isSignedIn: boolean;
}) {
  return (
    <nav className="hidden flex-wrap gap-2 md:flex">
      {links.map((link) => {
        const className =
          "border border-[#ead9c8] bg-[#fff8f1] px-3 py-2 text-sm font-medium text-[#4a2e22] transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-secondary)]";
        if (PUBLIC_HREFS.has(link.href) || isSignedIn) {
          return (
            <Link key={link.href} href={link.href} className={className}>
              {link.label}
            </Link>
          );
        }
        return (
          <GuestAwareLink
            key={link.href}
            href={link.href}
            isSignedIn={false}
            className={className}
          >
            {link.label}
          </GuestAwareLink>
        );
      })}
    </nav>
  );
}

export function CustomerBottomNav({
  items,
  activeNav,
  isSignedIn,
}: {
  items: ReadonlyArray<{
    key: string;
    href: string;
    label: string;
    icon: string;
  }>;
  activeNav?: string;
  isSignedIn: boolean;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ead9c8] bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((item) => {
          const active = activeNav === item.key;
          const className = `flex min-w-[4.5rem] flex-col items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold transition ${
            active
              ? "bg-[#f0e8e0] text-[var(--brand-primary)]"
              : "text-[#6b4a3a]"
          }`;
          const content = (
            <>
              <span className="text-lg" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </>
          );
          if (PUBLIC_HREFS.has(item.href) || isSignedIn) {
            return (
              <Link key={item.key} href={item.href} className={className}>
                {content}
              </Link>
            );
          }
          return (
            <GuestAwareLink
              key={item.key}
              href={item.href}
              isSignedIn={false}
              className={className}
            >
              {content}
            </GuestAwareLink>
          );
        })}
      </div>
    </nav>
  );
}
