"use client";

import { useState } from "react";

import { confirmDestructive } from "@/lib/confirm-destructive";

type MigrationSummary = {
  dryRun: boolean;
  scanned: number;
  empty: number;
  alreadyR2: number;
  notUploadThing: number;
  invalid: number;
  candidates: number;
  processed: number;
  copied: number;
  alreadyStored: number;
  rewritten: number;
  skipped: number;
  failed: number;
  remaining: number;
  errors: { url: string; message: string }[];
};

const LABELS: Record<string, string> = {
  scanned: "الروابط المفحوصة",
  alreadyR2: "موجودة على R2",
  notUploadThing: "روابط أخرى (لم تُمس)",
  invalid: "روابط UploadThing بلا مفتاح",
  candidates: "صور UploadThing المطلوب نقلها",
  processed: "عُولجت في هذه الدفعة",
  copied: "نُسخت الآن",
  alreadyStored: "كانت منسوخة مسبقًا",
  rewritten: "روابط قاعدة البيانات التي تحدّثت",
  skipped: "تُركت لأن السجل تغيّر",
  failed: "فشل",
  remaining: "المتبقي",
};

export function MediaMigrationPanel() {
  const [loading, setLoading] = useState<"dry" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MigrationSummary | null>(null);

  async function run(dryRun: boolean) {
    if (!dryRun) {
      const confirmed = confirmDestructive(
        "سيتم نسخ صور UploadThing إلى R2 وتحديث روابطها في قاعدة البيانات. الصور الأصلية لا تُحذف. المتابعة؟",
      );
      if (!confirmed) {
        return;
      }
    }

    setLoading(dryRun ? "dry" : "apply");
    setError(null);

    try {
      const response = await fetch("/api/admin/media-migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, limit: 20 }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (MigrationSummary & { error?: string })
        | null;
      if (!response.ok || !payload || payload.error) {
        throw new Error(payload?.error || "تعذر نقل الصور.");
      }
      setSummary(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر نقل الصور.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">نقل الصور من UploadThing إلى R2</h2>
      <div className="mt-3 max-w-3xl space-y-2 text-sm leading-7 text-zinc-600">
        <p>
          الصور الجديدة تُرفع مباشرة إلى Cloudflare R2. هذه الأداة للصور القديمة
          المخزّنة كروابط UploadThing فقط.
        </p>
        <p>1. اضغط «معاينة» أولًا. لا تُنسخ ملفات ولا تتغير قاعدة البيانات.</p>
        <p>
          2. اضغط «تنفيذ دفعة». تُنسخ حتى 20 صورة في كل مرة، ثم يُحدَّث الرابط
          في قاعدة البيانات. كرّر حتى يصبح «المتبقي» صفرًا.
        </p>
        <p>
          الأداة آمنة للإعادة: المفتاح ثابت لكل رابط، والصف يُحدَّث فقط إذا كان
          الرابط ما زال رابط UploadThing نفسه. الملفات الأصلية على UploadThing
          لا تُحذف.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => run(true)}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {loading === "dry" ? "جارٍ المعاينة..." : "معاينة"}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => run(false)}
          className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading === "apply" ? "جارٍ النقل..." : "تنفيذ دفعة"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {summary ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium">
            {summary.dryRun ? "نتيجة المعاينة" : "نتيجة الدفعة"}
          </p>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                "scanned",
                "candidates",
                "alreadyR2",
                "notUploadThing",
                "invalid",
                "processed",
                "copied",
                "alreadyStored",
                "rewritten",
                "skipped",
                "failed",
                "remaining",
              ] as const
            ).map((key) => (
              <div
                key={key}
                className="rounded-2xl border border-zinc-200 px-4 py-3"
              >
                <dt className="text-xs text-zinc-500">{LABELS[key]}</dt>
                <dd className="mt-1 text-2xl font-bold">{summary[key]}</dd>
              </div>
            ))}
          </dl>
          {summary.errors.length > 0 ? (
            <ul className="space-y-2 text-sm text-red-700">
              {summary.errors.map((item) => (
                <li key={`${item.url}-${item.message}`} className="break-all">
                  {item.message} — {item.url}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
