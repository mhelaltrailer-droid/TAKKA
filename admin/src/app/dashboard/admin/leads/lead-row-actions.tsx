"use client";

import { useTransition } from "react";
import type { KitchenJoinLeadStatus } from "@prisma/client";

import { KITCHEN_JOIN_STATUSES } from "@/lib/kitchen-join-leads";

import { updateKitchenJoinLead } from "./actions";

type Props = {
  id: string;
  status: KitchenJoinLeadStatus;
  note: string | null;
};

export function LeadRowActions({ id, status, note }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex min-w-[220px] flex-col gap-2"
      action={(formData) => {
        startTransition(async () => {
          const result = await updateKitchenJoinLead(formData);
          if (!result.ok && result.error) {
            window.alert(result.error);
          }
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        disabled={pending}
      >
        {KITCHEN_JOIN_STATUSES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <input
        name="note"
        defaultValue={note ?? ""}
        placeholder="ملاحظة قصيرة (اختياري)"
        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "…" : "حفظ"}
      </button>
    </form>
  );
}
