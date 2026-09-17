import Link from "next/link";

export function KitchenStatsRangeForm({
  fromKey,
  toKey,
}: {
  fromKey: string;
  toKey: string;
}) {
  return (
    <form
      className="flex flex-col gap-3 rounded-3xl border border-[#ead9c8] bg-white p-5 sm:flex-row sm:flex-wrap sm:items-end"
      method="get"
    >
      <div className="space-y-1">
        <label htmlFor="from" className="block text-sm font-medium">
          من
        </label>
        <input
          id="from"
          name="from"
          type="date"
          defaultValue={fromKey}
          className="rounded-2xl border border-[#ead9c8] px-4 py-2.5 outline-none"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="to" className="block text-sm font-medium">
          إلى
        </label>
        <input
          id="to"
          name="to"
          type="date"
          defaultValue={toKey}
          className="rounded-2xl border border-[#ead9c8] px-4 py-2.5 outline-none"
        />
      </div>
      <button
        type="submit"
        className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white"
      >
        تطبيق المدة
      </button>
      <Link
        href="/dashboard/kitchen/stats"
        className="rounded-full border border-[#ead9c8] px-5 py-2.5 text-center text-sm font-medium"
      >
        آخر 30 يومًا
      </Link>
    </form>
  );
}
