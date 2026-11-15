import type { Metadata } from "next";

import { listActiveObourDistricts } from "@/lib/districts";
import {
  JOIN_KITCHEN_DESCRIPTION,
  JOIN_KITCHEN_OG_IMAGE,
  JOIN_KITCHEN_ORIGIN,
  JOIN_KITCHEN_TITLE,
  JOIN_KITCHEN_URL,
} from "@/lib/join-kitchen-meta";
import { normalizeLeadSource } from "@/lib/kitchen-join-leads";
import { OBOUR_DISTRICTS } from "@/lib/obour-areas";

import { JoinKitchenForm } from "./join-kitchen-form";

export const metadata: Metadata = {
  metadataBase: new URL(JOIN_KITCHEN_ORIGIN),
  title: JOIN_KITCHEN_TITLE,
  description: JOIN_KITCHEN_DESCRIPTION,
  openGraph: {
    title: JOIN_KITCHEN_TITLE,
    description: JOIN_KITCHEN_DESCRIPTION,
    url: JOIN_KITCHEN_URL,
    siteName: "تكة",
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: JOIN_KITCHEN_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "الأكل البيتي كله على تكة",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: JOIN_KITCHEN_TITLE,
    description: JOIN_KITCHEN_DESCRIPTION,
    images: [JOIN_KITCHEN_OG_IMAGE],
  },
};

export default async function JoinKitchenPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawSource = Array.isArray(params.src) ? params.src[0] : params.src;
  const source = normalizeLeadSource(rawSource) ?? "";

  let districts: string[] = [...OBOUR_DISTRICTS];
  try {
    const rows = await listActiveObourDistricts();
    if (rows.length > 0) {
      districts = rows.map((row) => row.regionName);
    }
  } catch {
    // Fall back to seeded defaults, already in natural order.
  }

  return (
    <main className="relative min-h-screen bg-[#FEFAEE]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_#E8742A33,_transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10">
        <div className="rounded-3xl border border-[#5C3016]/15 bg-white p-6 shadow-sm md:p-8">
          <JoinKitchenForm districts={districts} source={source} />
        </div>
      </div>
    </main>
  );
}
