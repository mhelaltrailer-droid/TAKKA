import Link from "next/link";

type AnalyticsRangeFormProps = {
  fromKey: string;
  toKey: string;
};

export function AnalyticsRangeForm({ fromKey, toKey }: AnalyticsRangeFormProps) {
  return (
    <form
      className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
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
          className="rounded-2xl border border-zinc-300 px-4 py-2.5 outline-none"
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
          className="rounded-2xl border border-zinc-300 px-4 py-2.5 outline-none"
        />
      </div>
      <button
        type="submit"
        className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white"
      >
        تطبيق المدة
      </button>
      <Link
        href="/dashboard/admin/analytics"
        className="rounded-full border border-zinc-300 px-5 py-2.5 text-center text-sm font-medium"
      >
        آخر 30 يومًا
      </Link>
    </form>
  );
}
