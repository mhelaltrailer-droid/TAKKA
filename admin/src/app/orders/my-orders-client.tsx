"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OrderStatus } from "@prisma/client";

import {
  getOrderStatusLabel,
  isActiveOrderStatus,
  isPreviousOrderStatus,
} from "@/lib/order-status";

export type MyOrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryType: "DELIVERY" | "PICKUP";
  totalAmount: number;
  kitchenName: string;
  itemsCount: number;
  createdAtLabel: string;
};

export function MyOrdersClient({ orders }: { orders: MyOrderListItem[] }) {
  const [showActive, setShowActive] = useState(true);

  const filtered = useMemo(() => {
    return orders.filter((order) =>
      showActive
        ? isActiveOrderStatus(order.status)
        : isPreviousOrderStatus(order.status),
    );
  }, [orders, showActive]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 rounded-2xl bg-[#f2f2f2] p-1">
        <button
          type="button"
          onClick={() => setShowActive(true)}
          className={`rounded-xl py-3 text-sm font-bold transition ${
            showActive
              ? "bg-white text-[#3b2418] shadow-sm"
              : "text-[#6b4a3a]"
          }`}
        >
          النشطة
        </button>
        <button
          type="button"
          onClick={() => setShowActive(false)}
          className={`rounded-xl py-3 text-sm font-bold transition ${
            !showActive
              ? "bg-white text-[#3b2418] shadow-sm"
              : "text-[#6b4a3a]"
          }`}
        >
          السابقة
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-[#6b4a3a]">
          {showActive
            ? "لا توجد طلبات نشطة حالياً"
            : "لا توجد طلبات سابقة"}
        </p>
      ) : (
        <section className="space-y-4">
          {filtered.map((order) => {
            const cancelled =
              order.status.startsWith("CANCELLED") ||
              order.status === "REJECTED_BY_KITCHEN";
            return (
              <article
                key={order.id}
                className="rounded-2xl border border-[#ead9c8] bg-white p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#f7f0ea] text-2xl">
                    🍽️
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-[#3b2418]">
                      {order.kitchenName}
                    </p>
                    <p className="text-sm text-[#6b4a3a]">
                      طلب رقم {order.orderNumber}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f2f2f2] px-3 py-1 text-xs font-semibold text-[#4a2e22]">
                    {cancelled ? "تم الإلغاء" : getOrderStatusLabel(order.status)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-[#6b4a3a]">
                    {order.deliveryType === "DELIVERY" ? "توصيل" : "استلام"} ·{" "}
                    {order.itemsCount} أصناف
                  </span>
                  <span className="font-bold text-[#3b2418]">
                    {order.totalAmount.toFixed(0)} ج.م
                  </span>
                </div>

                <Link
                  href={`/orders/${order.id}`}
                  className="mt-4 flex w-full items-center justify-center rounded-full bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
                >
                  تتبع الطلب
                </Link>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
