import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import {
  CustomerBottomNav,
  CustomerTopNav,
} from "@/components/customer-shell-nav";
import { LiveNotificationBell } from "@/components/live-notification-bell";
import { isClerkConfigured } from "@/lib/clerk";

const customerTopLinks = [
  { href: "/kitchens", label: "المطابخ" },
  { href: "/cart", label: "السلة" },
  { href: "/orders", label: "طلباتي" },
  { href: "/account", label: "حسابي" },
  { href: "/addresses", label: "عناويني" },
  { href: "/notifications", label: "الإشعارات" },
  { href: "/dashboard", label: "لوحتي" },
] as const;

const kitchenLinks = [
  { href: "/dashboard", label: "لوحتي" },
  { href: "/dashboard/kitchen/onboarding", label: "المطبخ" },
  { href: "/dashboard/menu", label: "المنيو" },
  { href: "/dashboard/orders", label: "الطلبات" },
  { href: "/notifications", label: "الإشعارات" },
] as const;

const customerBottomNav = [
  { key: "home", href: "/kitchens", label: "الرئيسية", icon: "🏠" },
  { key: "orders", href: "/orders", label: "طلباتي", icon: "🛍️" },
  { key: "account", href: "/account", label: "حسابي", icon: "👤" },
] as const;

export function AppShell({
  children,
  mode = "customer",
  userId,
  unreadNotificationsCount = 0,
  title,
  subtitle,
  activeNav,
}: {
  children: React.ReactNode;
  mode?: "customer" | "kitchen";
  userId?: string;
  unreadNotificationsCount?: number;
  title?: string;
  subtitle?: string;
  activeNav?: "home" | "orders" | "account";
}) {
  const isSignedIn = Boolean(userId);
  const links = mode === "kitchen" ? kitchenLinks : customerTopLinks;
  const showCustomerBottomNav = mode === "customer";

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[#ead9c8] bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              href={mode === "kitchen" ? "/dashboard" : "/kitchens"}
              className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--brand-secondary)]"
            >
              تكة
            </Link>
            <div className="flex items-center gap-3">
              {userId ? (
                <LiveNotificationBell
                  userId={userId}
                  initialUnreadCount={unreadNotificationsCount}
                />
              ) : null}
              {isClerkConfigured && isSignedIn ? (
                <UserButton afterSignOutUrl="/" />
              ) : null}
              {!isSignedIn && mode === "customer" ? (
                <Link
                  href="/sign-up"
                  className="text-sm font-semibold text-[var(--brand-primary)]"
                >
                  سجل الآن
                </Link>
              ) : null}
            </div>
          </div>
          {mode === "customer" ? (
            <CustomerTopNav links={[...links]} isSignedIn={isSignedIn} />
          ) : (
            <nav className="hidden flex-wrap gap-2 md:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border border-[#ead9c8] bg-[#fff8f1] px-3 py-2 text-sm font-medium text-[#4a2e22] transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-secondary)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
          {title ? (
            <div className="space-y-1 pb-1">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold md:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="text-sm leading-7 text-[#6b4a3a]">{subtitle}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      <div
        className={`mx-auto w-full max-w-6xl px-6 py-8 ${
          showCustomerBottomNav ? "pb-28" : ""
        }`}
      >
        {children}
      </div>

      {showCustomerBottomNav ? (
        <CustomerBottomNav
          items={[...customerBottomNav]}
          activeNav={activeNav}
          isSignedIn={isSignedIn}
        />
      ) : null}
    </main>
  );
}
