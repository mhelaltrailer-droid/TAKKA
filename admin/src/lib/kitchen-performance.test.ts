import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KITCHEN_NO_RESPONSE_REASON } from "./kitchen-order-rules";
import {
  classifyKitchenOrder,
  summarizeKitchenOrders,
  type KitchenOrderAuditInput,
} from "./kitchen-performance";

function order(
  overrides: Partial<KitchenOrderAuditInput> = {},
): KitchenOrderAuditInput {
  return {
    placedAt: new Date("2026-11-22T10:00:00.000Z"),
    acceptedAt: null,
    cancelledAt: null,
    kitchenRespondedAt: null,
    kitchenResponse: null,
    cancelReason: null,
    status: "PENDING_KITCHEN_APPROVAL",
    ...overrides,
  };
}

describe("kitchen performance audit", () => {
  it("keeps an accepted order accepted after the status moves on", () => {
    const kind = classifyKitchenOrder(
      order({
        status: "COMPLETED",
        kitchenResponse: "ACCEPTED",
        kitchenRespondedAt: new Date("2026-11-22T10:04:00.000Z"),
        acceptedAt: new Date("2026-11-22T10:04:00.000Z"),
      }),
    );
    assert.equal(kind, "accepted");
  });

  it("does not count an explicit reject or a customer cancel as no-response", () => {
    assert.equal(
      classifyKitchenOrder(
        order({
          status: "REJECTED_BY_KITCHEN",
          kitchenResponse: "REJECTED",
          kitchenRespondedAt: new Date("2026-11-22T10:02:00.000Z"),
          cancelledAt: new Date("2026-11-22T10:02:00.000Z"),
        }),
      ),
      "rejected",
    );
    assert.equal(
      classifyKitchenOrder(
        order({
          status: "CANCELLED_BEFORE_DEPOSIT",
          cancelReason: "ألغاه العميل قبل تأكيد العربون.",
          cancelledAt: new Date("2026-11-22T10:03:00.000Z"),
        }),
      ),
      "other",
    );
    assert.equal(
      classifyKitchenOrder(
        order({
          status: "CANCELLED_BEFORE_DEPOSIT",
          cancelReason: KITCHEN_NO_RESPONSE_REASON,
          cancelledAt: new Date("2026-11-22T10:10:00.000Z"),
        }),
      ),
      "no_response",
    );
  });

  it("computes acceptance rate and average response from durable timestamps", () => {
    const summary = summarizeKitchenOrders([
      order({
        kitchenResponse: "ACCEPTED",
        kitchenRespondedAt: new Date("2026-11-22T10:04:00.000Z"),
        acceptedAt: new Date("2026-11-22T10:04:00.000Z"),
        status: "PREPARING",
      }),
      order({
        kitchenResponse: "REJECTED",
        kitchenRespondedAt: new Date("2026-11-22T10:02:00.000Z"),
        cancelledAt: new Date("2026-11-22T10:02:00.000Z"),
        status: "REJECTED_BY_KITCHEN",
      }),
      order({
        status: "CANCELLED_BEFORE_DEPOSIT",
        cancelReason: KITCHEN_NO_RESPONSE_REASON,
        cancelledAt: new Date("2026-11-22T10:10:00.000Z"),
      }),
      order(),
    ]);

    assert.equal(summary.received, 4);
    assert.equal(summary.accepted, 1);
    assert.equal(summary.rejected, 1);
    assert.equal(summary.noResponse, 1);
    assert.equal(summary.pending, 1);
    assert.equal(summary.acceptanceRate, 0.25);
    assert.equal(summary.avgResponseMinutes, 3);
  });
});
