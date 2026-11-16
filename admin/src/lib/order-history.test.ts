import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  groupOrdersNewestFirst,
  orderHistoryDayLabel,
} from "./order-history";

const now = new Date(2026, 10, 16, 18, 30);

describe("order history grouping", () => {
  it("labels today and yesterday, then a full date", () => {
    assert.equal(
      orderHistoryDayLabel(new Date(2026, 10, 16, 9), now),
      "اليوم",
    );
    assert.equal(
      orderHistoryDayLabel(new Date(2026, 10, 15, 23), now),
      "أمس",
    );
    assert.equal(
      orderHistoryDayLabel(new Date(2026, 10, 10, 12), now),
      "10 نوفمبر 2026",
    );
  });

  it("groups newest first and keeps completed and cancelled orders", () => {
    const groups = groupOrdersNewestFirst(
      [
        {
          id: "old",
          status: "CANCELLED_BEFORE_DEPOSIT",
          createdAt: new Date(2026, 10, 10, 12).toISOString(),
        },
        {
          id: "today-late",
          status: "COMPLETED",
          createdAt: new Date(2026, 10, 16, 17).toISOString(),
        },
        {
          id: "today-early",
          status: "COMPLETED",
          createdAt: new Date(2026, 10, 16, 9).toISOString(),
        },
        {
          id: "yesterday",
          status: "CANCELLED_AFTER_DEPOSIT",
          createdAt: new Date(2026, 10, 15, 11).toISOString(),
        },
      ],
      now,
    );

    assert.deepEqual(
      groups.map((group) => ({
        label: group.label,
        ids: group.orders.map((order) => order.id),
      })),
      [
        { label: "اليوم", ids: ["today-late", "today-early"] },
        { label: "أمس", ids: ["yesterday"] },
        { label: "10 نوفمبر 2026", ids: ["old"] },
      ],
    );
  });
});
