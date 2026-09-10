"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { UploadField } from "@/components/upload-field";

type CustomerChatFormProps = {
  orderId: string;
};

export function CustomerChatForm({ orderId }: CustomerChatFormProps) {
  const router = useRouter();
  const [messageText, setMessageText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage() {
    setLoading(true);
    setError(null);

    try {
      if (!messageText.trim() && !imageUrl) {
        throw new Error("أدخل رسالة أو أرفق صورة قبل الإرسال.");
      }

      const response = await fetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: messageText.trim() || undefined,
          imageUrl: imageUrl || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر إرسال الرسالة.");
      }

      setMessageText("");
      setImageUrl("");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر إرسال الرسالة.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">إرسال رسالة للمطبخ</h2>
      <div className="mt-4 space-y-4">
        <textarea
          rows={4}
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          placeholder="اكتب رسالتك هنا..."
          className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        />

        <UploadField
          endpoint="chatImage"
          label="إرفاق صورة"
          buttonLabel="إرفاق صورة"
          includeHiddenInput={false}
          onUploaded={setImageUrl}
        />

        {imageUrl ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            تم إرفاق صورة مع الرسالة بنجاح.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={sendMessage}
          disabled={loading}
          className="w-full rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "جارٍ الإرسال..." : "إرسال الرسالة"}
        </button>
      </div>
    </div>
  );
}
