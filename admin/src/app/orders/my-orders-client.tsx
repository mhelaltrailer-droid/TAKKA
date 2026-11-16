"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OrderStatus } from "@prisma/client";

import { ReorderButton } from "@/components/reorder-button";
import { getCustomerOrderStatusLabel } from "@/lib/customer-order-status";
import {
  formatOrderClock,
  groupOrdersNewestFirst,
} from "@/lib/order-history";
import {
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
  kitchenSlug: string;
  itemsCount: number;
  createdAt: string;
  hasReview: boolean;
};

export function MyOrdersClient({ orders }: { orders: MyOrderListItem[] }) {
  const [showActive, setShowActive] = useState(true);

  const groups = useMemo(() => {
    const filtered = orders.filter((order) =>
      showActive
        ? isActiveOrderStatus(order.status)
        : isPreviousOrderStatus(order.status),
    );
    return groupOrdersNewestFirst(filtered);
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

      {groups.length === 0 ? (
        <p className="py-16 text-center text-sm text-[#6b4a3a]">
          {showActive ? "لا توجد طلبات نشطة حالياً" : "لا توجد طلبات سابقة"}
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="space-y-3">
            <h2 className="px-1 text-sm font-bold text-[#6b4a3a]">
              {group.label}
            </h2>
            {group.orders.map((order) => {
              const previous = isPreviousOrderStatus(order.status);
              const when = new Date(order.createdAt);
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
                      <p className="mt-1 text-xs text-[#6b4a3a]">
                        {group.label}
                        {formatOrderClock(when)
                          ? ` · ${formatOrderClock(when)}`
                          : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f2f2f2] px-3 py-1 text-xs font-semibold text-[#4a2e22]">
                      {getCustomerOrderStatusLabel(
                        order.status,
                        order.deliveryType,
                      )}
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

                  <div className="mt-4 space-y-2">
                    {order.kitchenSlug ? (
                      <Link
                        href={`/kitchens/${order.kitchenSlug}`}
                        className="flex w-full items-center justify-center rounded-full border border-[#ead9c8] px-4 py-3 text-sm font-bold text-[#3b2418]"
                      >
                        من نفس المطبخ
                      </Link>
                    ) : null}
                    {previous ? <ReorderButton orderId={order.id} /> : null}
                    {order.status === "COMPLETED" && !order.hasReview ? (
                      <Link
                        href={`/orders/${order.id}`}
                        className="flex w-full items-center justify-center rounded-full bg-[#fff8f1] px-4 py-3 text-sm font-bold text-[#e67e22]"
                      >
                        قيّم تجربتك
                      </Link>
                    ) : null}
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex w-full items-center justify-center rounded-full bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
                    >
                      {previous ? "تفاصيل الطلب" : "تتبع الطلب"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
