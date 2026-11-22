import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  annotateCheckoutLines,
  parseCheckoutPayload,
} from "./checkout-quote-model";

describe("checkout quote model", () => {
  it("keeps expected prices for comparison and ignores them as money input", () => {
    const parsed = parseCheckoutPayload({
      kitchenId: "kit",
      deliveryType: "delivery",
      customerAddressId: "addr",
      deliveryLatitude: "30.22",
      deliveryLongitude: 31.48,
      items: [
        {
          menuItemId: "item",
          quantity: 2,
          expectedUnitPrice: "40.5",
          expectedDepositAmount: 5,
        },
      ],
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.value.deliveryType, "delivery");
    assert.equal(parsed.value.deliveryLatitude, 30.22);
    assert.equal(parsed.value.items[0]?.expectedUnitPrice, 40.5);
    assert.equal(parsed.value.items[0]?.expectedDepositAmount, 5);
  });

  it("lists a price change and an inactive line without trusting the client price", () => {
    const { lines, changes } = annotateCheckoutLines([
      {
        menuItemId: "a",
        menuItemSizeId: null,
        itemName: "كشري",
        sizeName: null,
        quantity: 1,
        unitPrice: 45,
        depositAmount: 10,
        lineTotal: 45,
        available: true,
        availability: "available",
        reason: null,
        expectedUnitPrice: 40,
        expectedDepositAmount: 10,
      },
      {
        menuItemId: "b",
        menuItemSizeId: "size",
        itemName: "طاجن",
        sizeName: "كبير",
        quantity: 1,
        unitPrice: null,
        depositAmount: null,
        lineTotal: null,
        available: false,
        availability: "inactive",
        reason: "طاجن (كبير): غير نشط وتم حذفه من السلة.",
        expectedUnitPrice: 70,
        expectedDepositAmount: null,
      },
    ]);

    assert.equal(lines[0]?.priceChanged, true);
    assert.equal(lines[0]?.depositChanged, false);
    assert.equal(lines[0]?.unitPrice, 45);
    assert.equal(changes.length, 2);
    assert.equal(changes[0]?.kind, "price");
    assert.match(changes[0]?.message ?? "", /40 إلى 45/);
    assert.equal(changes[1]?.kind, "inactive");
  });
});
