import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { LiveNotificationBell } from "@/components/live-notification-bell";
import { isClerkConfigured } from "@/lib/clerk";

const customerTopLinks = [
  { href: "/kitchens", label: "المطابخ" },
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
              {isClerkConfigured ? <UserButton afterSignOutUrl="/" /> : null}
            </div>
          </div>
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
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ead9c8] bg-white/95 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
            {customerBottomNav.map((item) => {
              const active = activeNav === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-[#f0e8e0] text-[var(--brand-primary)]"
                      : "text-[#6b4a3a]"
                  }`}
                >
                  <span className="text-lg" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </main>
  );
}
