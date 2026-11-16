"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  getWebCart,
  replaceWebCart,
  type WebCartItem,
} from "@/lib/web-cart";

type PreviewItem = {
  menuItemId: string;
  menuItemName: string;
  menuItemSizeId: string | null;
  sizeName: string | null;
  quantity: number;
  customerNote: string | null;
  unitPrice: number;
  depositAmount: number;
  orderReadiness: string;
};

type PreviewKitchen = {
  id: string;
  kitchenName: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  addressLine: string;
  regionLabel: string;
};

type ReorderPreview = {
  kitchenAvailable: boolean;
  message: string | null;
  kitchen: PreviewKitchen | null;
  items: PreviewItem[];
  notices: string[];
  error?: string;
};

type DialogState = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  function ask(next: DialogState) {
    setDialog(next);
  }

  function applyPreview(preview: ReorderPreview) {
    if (!preview.kitchen || !preview.kitchenAvailable) {
      ask({
        title: "مقدرناش نكرر الطلب",
        body:
          preview.message ||
          "المطبخ مش متاح دلوقتي. جرّب تاني لما يفتح.",
        confirmLabel: "تمام",
        onConfirm: () => setDialog(null),
      });
      return;
    }

    if (!preview.items.length) {
      ask({
        title: "مفيش أصناف متاحة",
        body: [preview.message, ...preview.notices].filter(Boolean).join("\n"),
        confirmLabel: "تمام",
        onConfirm: () => setDialog(null),
      });
      return;
    }

    const place = () => {
      const items: WebCartItem[] = preview.items.map((item, index) => ({
        id: `${item.menuItemId}-${item.menuItemSizeId ?? "base"}-${index}`,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        menuItemSizeId: item.menuItemSizeId,
        sizeName: item.sizeName,
        unitPrice: item.unitPrice,
        depositAmount: item.depositAmount,
        quantity: item.quantity,
        customerNote: item.customerNote,
        orderReadiness: item.orderReadiness || "AVAILABLE_NOW",
      }));
      replaceWebCart({
        kitchenId: preview.kitchen!.id,
        kitchenName: preview.kitchen!.kitchenName,
        kitchenSlug: preview.kitchen!.slug,
        kitchenLatitude: preview.kitchen!.latitude,
        kitchenLongitude: preview.kitchen!.longitude,
        kitchenAddressLine: preview.kitchen!.addressLine,
        kitchenRegionLabel: preview.kitchen!.regionLabel,
        items,
      });
      const body = preview.notices.length
        ? `${preview.notices.join("\n")}\nالأسعار الحالية اتحطت في السلة.`
        : "رجّعنا الأصناف للسلة بنفس الكميات والملاحظات، وبالأسعار الحالية.";
      ask({
        title: "تم تجهيز الطلب تاني",
        body,
        confirmLabel: "روح للسلة",
        onConfirm: () => {
          setDialog(null);
          router.push("/cart");
        },
      });
    };

    const cart = getWebCart();
    if (
      cart.items.length > 0 &&
      cart.kitchenId &&
      cart.kitchenId !== preview.kitchen.id
    ) {
      ask({
        title: "السلة فيها مطبخ تاني",
        body: "السلة فيها أصناف من مطبخ تاني. لو كملت هنستبدلها بأصناف الطلب ده.",
        confirmLabel: "استبدال السلة",
        cancelLabel: "إلغاء",
        onConfirm: place,
      });
      return;
    }

    place();
  }

  async function start() {
    setBusy(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/reorder-preview`);
      const preview = (await response.json()) as ReorderPreview;
      if (!response.ok) {
        throw new Error(preview.error || "تعذر تجهيز الطلب تاني.");
      }
      applyPreview(preview);
    } catch (error) {
      ask({
        title: "مقدرناش نكرر الطلب",
        body:
          error instanceof Error
            ? error.message
            : "تعذر تجهيز الطلب تاني.",
        confirmLabel: "تمام",
        onConfirm: () => setDialog(null),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="flex w-full items-center justify-center rounded-full border border-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-[var(--brand-primary)] transition hover:bg-[#fff8f1] disabled:opacity-70"
      >
        {busy ? "جارٍ التجهيز..." : "اطلب تاني"}
      </button>
      {dialog ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#3b2418]">{dialog.title}</h3>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#4a2e22]">
              {dialog.body}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={dialog.onConfirm}
                className="rounded-full bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white"
              >
                {dialog.confirmLabel}
              </button>
              {dialog.cancelLabel ? (
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="rounded-full border border-zinc-300 px-4 py-3 text-sm font-semibold"
                >
                  {dialog.cancelLabel}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
