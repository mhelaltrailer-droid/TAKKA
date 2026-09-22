"use client";

import { useState } from "react";

import { confirmDestructive } from "@/lib/confirm-destructive";

type Category = {
  id: string;
  slug: string;
  label: string;
  thumb: string;
  keywords: string[];
  sortOrder: number;
  isActive: boolean;
  menuItemCount: number;
};

type FoodCategoryManagerProps = {
  initialCategories: Category[];
};

export function FoodCategoryManager({
  initialCategories,
}: FoodCategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [label, setLabel] = useState("");
  const [thumb, setThumb] = useState("🍽️");
  const [keywords, setKeywords] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingThumb, setEditingThumb] = useState("");
  const [editingKeywords, setEditingKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function addCategory() {
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch("/api/admin/food-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          thumb,
          keywords,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "تعذر إضافة الفئة.");
      }

      setCategories((current) =>
        [...current, result.category].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "ar"),
        ),
      );
      setLabel("");
      setThumb("🍽️");
      setKeywords("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إضافة الفئة.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit(id: string) {
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/admin/food-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editingLabel,
          thumb: editingThumb,
          keywords: editingKeywords,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "تعذر تعديل الفئة.");
      }

      setCategories((current) =>
        current
          .map((item) => (item.id === id ? result.category : item))
          .sort(
            (a, b) =>
              a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "ar"),
          ),
      );
      setEditingId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تعديل الفئة.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(category: Category) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/food-categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "تعذر تحديث الفئة.");
      }
      setCategories((current) =>
        current.map((item) =>
          item.id === category.id ? result.category : item,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحديث الفئة.");
    } finally {
      setLoading(false);
    }
  }

  async function removeCategory(id: string, label: string) {
    if (
      !confirmDestructive(
        `هل أنت متأكد من حذف الفئة «${label}»؟ لا يمكن التراجع بسهولة.`,
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/admin/food-categories/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "تعذر حذف الفئة.");
      }

      if (result.softDeleted && result.category) {
        setCategories((current) =>
          current.map((item) => (item.id === id ? result.category : item)),
        );
        setInfo(result.message || "تم إخفاء الفئة لأنها مستخدمة.");
      } else {
        setCategories((current) => current.filter((item) => item.id !== id));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حذف الفئة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-xl text-[var(--brand-primary)]">
            🍽️
          </span>
          <div>
            <h2 className="text-xl font-semibold">إضافة فئة جديدة</h2>
            <p className="text-sm text-zinc-500">تاكل ايه؟</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="مثال: بيتزا"
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
          />
          <input
            value={thumb}
            onChange={(event) => setThumb(event.target.value)}
            placeholder="أيقونة (إيموجي)"
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
          />
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="كلمات بحث مفصولة بفاصلة (اختياري)"
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
          />
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {info}
            </p>
          ) : null}
          <button
            type="button"
            onClick={addCategory}
            disabled={loading || !label.trim()}
            className="w-full rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "جارٍ الحفظ..." : "إضافة الفئة"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">فئات تاكل ايه؟</h2>
        <div className="mt-5 space-y-3">
          {categories.length === 0 ? (
            <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
              لا توجد فئات بعد.
            </div>
          ) : (
            categories.map((category) => (
              <article
                key={category.id}
                className="rounded-2xl border border-zinc-200 p-4"
              >
                {editingId === category.id ? (
                  <div className="space-y-3">
                    <input
                      value={editingLabel}
                      onChange={(event) => setEditingLabel(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
                    />
                    <input
                      value={editingThumb}
                      onChange={(event) => setEditingThumb(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
                    />
                    <input
                      value={editingKeywords}
                      onChange={(event) =>
                        setEditingKeywords(event.target.value)
                      }
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(category.id)}
                        disabled={loading || !editingLabel.trim()}
                        className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        حفظ التعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl" aria-hidden>
                        {category.thumb}
                      </span>
                      <h3 className="text-lg font-semibold">{category.label}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          category.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {category.isActive ? "ظاهرة في القائمة" : "مخفية"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      معرّف: {category.slug} | وجبات: {category.menuItemCount}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditingLabel(category.label);
                          setEditingThumb(category.thumb);
                          setEditingKeywords(category.keywords.join("، "));
                        }}
                        disabled={loading}
                        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(category)}
                        disabled={loading}
                        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
                      >
                        {category.isActive ? "إخفاء" : "إظهار"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          removeCategory(category.id, category.label)
                        }
                        disabled={loading}
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
                      >
                        حذف
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
