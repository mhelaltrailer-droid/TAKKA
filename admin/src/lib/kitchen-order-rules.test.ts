import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  KITCHEN_NO_RESPONSE_REASON,
  KITCHEN_ORDER_POLICY_DEFAULTS,
  customerFacingAvailability,
  ownerCanLiftSuspension,
  suspensionLevelFor,
  suspensionMessageFor,
  isAwaitingAcceptancePastDeadline,
  isNoResponseCancellation,
  kitchenAcceptsOrders,
  parseKitchenOrderPolicyInput,
  suspensionDecision,
  unavailableOrderError,
} from "./kitchen-order-rules";

const policy = KITCHEN_ORDER_POLICY_DEFAULTS;

describe("kitchen order rules", () => {
  it("shows a suspended kitchen as busy and refuses orders", () => {
    assert.equal(customerFacingAvailability("OPEN", true), "BUSY");
    assert.equal(customerFacingAvailability("CLOSED", true), "BUSY");
    assert.equal(customerFacingAvailability("BUSY", false), "BUSY");
    assert.equal(
      kitchenAcceptsOrders({
        approvalStatus: "APPROVED",
        availabilityStatus: "OPEN",
        suspended: true,
      }),
      false,
    );
    assert.equal(
      kitchenAcceptsOrders({
        approvalStatus: "APPROVED",
        availabilityStatus: "BUSY",
        suspended: false,
      }),
      false,
    );
    assert.equal(
      kitchenAcceptsOrders({
        approvalStatus: "APPROVED",
        availabilityStatus: "CLOSED",
        suspended: false,
      }),
      false,
    );
    assert.equal(
      kitchenAcceptsOrders({
        approvalStatus: "APPROVED",
        availabilityStatus: "OPEN",
        suspended: false,
      }),
      true,
    );
    assert.match(unavailableOrderError({
      availabilityStatus: "OPEN",
      suspended: true,
    }), /مشغول/);
    assert.match(unavailableOrderError({
      availabilityStatus: "CLOSED",
      suspended: false,
    }), /مغلق/);
  });

  it("treats the acceptance deadline as elapsed at the exact timeout", () => {
    const now = new Date("2026-11-22T12:10:00.000Z");
    const placed = new Date("2026-11-22T12:00:00.000Z");
    assert.equal(
      isAwaitingAcceptancePastDeadline(placed, policy.acceptanceTimeoutMinutes, now),
      true,
    );
    assert.equal(
      isAwaitingAcceptancePastDeadline(
        new Date("2026-11-22T12:00:01.000Z"),
        policy.acceptanceTimeoutMinutes,
        now,
      ),
      false,
    );
  });

  it("counts only the no-response reason toward suspension", () => {
    assert.equal(isNoResponseCancellation(KITCHEN_NO_RESPONSE_REASON), true);
    assert.equal(isNoResponseCancellation("REJECTED_BY_KITCHEN"), false);
    assert.equal(
      isNoResponseCancellation("ألغاه العميل قبل تأكيد العربون."),
      false,
    );
    assert.equal(isNoResponseCancellation(null), false);
  });

  it("suspends at either rolling threshold and not before", () => {
    assert.equal(
      suspensionDecision({
        shortCount: 2,
        longCount: 19,
        shortWindowCount: policy.shortWindowCount,
        longWindowCount: policy.longWindowCount,
      }),
      null,
    );
    assert.equal(
      suspensionDecision({
        shortCount: 3,
        longCount: 3,
        shortWindowCount: 3,
        longWindowCount: 20,
      }),
      "short",
    );
    assert.equal(
      suspensionDecision({
        shortCount: 1,
        longCount: 20,
        shortWindowCount: 3,
        longWindowCount: 20,
      }),
      "long",
    );
    assert.equal(
      suspensionDecision({
        shortCount: 3,
        longCount: 20,
        shortWindowCount: 3,
        longWindowCount: 20,
      }),
      "both",
    );
  });

  it("uses level 2 when the long window is hit, and only level 1 can be lifted by the owner", () => {
    assert.equal(suspensionLevelFor("short"), "LEVEL_1");
    assert.equal(suspensionLevelFor("long"), "LEVEL_2");
    assert.equal(suspensionLevelFor("both"), "LEVEL_2");
    assert.equal(suspensionLevelFor(null), null);
    assert.equal(ownerCanLiftSuspension("LEVEL_1"), true);
    assert.equal(ownerCanLiftSuspension("LEVEL_2"), false);
    assert.match(suspensionMessageFor("LEVEL_1", policy), /فهمت/);
    assert.match(suspensionMessageFor("LEVEL_2", policy), /فريق تكة/);
    assert.doesNotMatch(suspensionMessageFor("LEVEL_2", policy), /فهمت/);
  });

  it("rejects a policy edit that is not a whole number in range", () => {
    const bad = parseKitchenOrderPolicyInput({
      ...policy,
      acceptanceTimeoutMinutes: "0",
    });
    assert.equal(bad.ok, false);

    const saved = parseKitchenOrderPolicyInput({
      acceptanceTimeoutMinutes: "12",
      shortWindowCount: "4",
      shortWindowHours: "12",
      longWindowCount: "15",
      longWindowDays: "60",
      customerNoResponseMessage: "  رسالة مخصصة للعميل بعد انتهاء المهلة  ",
      level1SuspensionMessage: policy.level1SuspensionMessage,
      level2SuspensionMessage: policy.level2SuspensionMessage,
    });
    assert.equal(saved.ok, true);
    if (saved.ok) {
      assert.equal(saved.value.acceptanceTimeoutMinutes, 12);
      assert.equal(
        saved.value.customerNoResponseMessage,
        "رسالة مخصصة للعميل بعد انتهاء المهلة",
      );
    }
  });
});
