import { Suspense } from "react";

import { listActiveObourDistricts } from "@/lib/districts";
import { OBOUR_DISTRICTS } from "@/lib/obour-areas";

import { JoinKitchenForm } from "./join-kitchen-form";

export const metadata = {
  title: "انضمي كمقدمة أكل | تكّة",
  description:
    "سجّلي اهتمامكِ لتقديم أكل بيتي من البيت في مدينة العبور عبر تكّة.",
};

export default async function JoinKitchenPage() {
  let districts: string[] = [...OBOUR_DISTRICTS];
  try {
    const rows = await listActiveObourDistricts();
    if (rows.length > 0) {
      districts = rows.map((row) => row.regionName);
    }
  } catch {
    // Fall back to seeded defaults.
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_#ffd7b066,_transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10">
        <Suspense
          fallback={
            <div className="rounded-3xl border border-[#ead9c8] bg-white/90 p-6 text-center text-sm text-[#6b4a3a]">
              جاري التحميل…
            </div>
          }
        >
          <div className="rounded-3xl border border-[#ead9c8] bg-white/95 p-6 shadow-sm md:p-8">
            <JoinKitchenForm districts={districts} />
          </div>
        </Suspense>
      </div>
    </main>
  );
}
