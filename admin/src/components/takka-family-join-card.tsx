import {
  TAKKA_FAMILY_JOIN_BODY,
  TAKKA_FAMILY_JOIN_NOTE,
  TAKKA_FAMILY_JOIN_TITLE,
  TAKKA_PARTNERS_COMMUNITY_URL,
} from "@/lib/takka-partners-community";

function FamilyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 11a3 3 0 1 0-2.83-4M8 11a3 3 0 1 0 2.83-4M4.5 19a4.5 4.5 0 0 1 7.5-3.35M12 19a4.5 4.5 0 0 1 7.5-3.35"
      />
    </svg>
  );
}

export function TakkaFamilyJoinCard() {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-primary)] text-white">
          <FamilyIcon />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#2f1c14]">
              {TAKKA_FAMILY_JOIN_TITLE}
            </h2>
            <p className="text-sm leading-7 text-[#5c4030]">
              {TAKKA_FAMILY_JOIN_BODY}
            </p>
            <p className="text-xs leading-6 text-[#6b4a3a]">
              {TAKKA_FAMILY_JOIN_NOTE}
            </p>
          </div>
          <a
            href={TAKKA_PARTNERS_COMMUNITY_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {TAKKA_FAMILY_JOIN_TITLE}
          </a>
        </div>
      </div>
    </section>
  );
}
