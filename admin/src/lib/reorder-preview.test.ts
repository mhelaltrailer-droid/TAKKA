import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildReorderPreview,
  type ReorderKitchenInput,
  type ReorderMenuItem,
  type ReorderSourceItem,
} from "./reorder-preview";

const kitchen: ReorderKitchenInput = {
  id: "kit-1",
  kitchenName: "مطبخ هدى",
  slug: "hoda",
  approvalStatus: "APPROVED",
  availabilityStatus: "OPEN",
  latitude: 30.2,
  longitude: 31.4,
  addressLine: "الحي السابع",
  regionLabel: "مدينة العبور - الحي السابع",
};

function menu(overrides: Partial<ReorderMenuItem> = {}): ReorderMenuItem {
  return {
    id: "item-1",
    name: "كشري",
    approvalStatus: "APPROVED",
    isAvailable: true,
    isDishOfTheDay: false,
    dishOfTheDayPrice: null,
    dishOfTheDayQty: null,
    basePrice: 50,
    discountedPrice: null,
    depositAmount: 10,
    orderReadiness: "AVAILABLE_NOW",
    sizes: [],
    flash: null,
    ...overrides,
  };
}

const ordered: ReorderSourceItem = {
  menuItemId: "item-1",
  menuItemSizeId: null,
  itemNameSnapshot: "كشري",
  sizeNameSnapshot: null,
  unitPrice: 40,
  quantity: 2,
  customerNote: "من غير بصل",
};

describe("buildReorderPreview", () => {
  it("uses the current price and keeps size, quantity, and note", () => {
    const preview = buildReorderPreview({
      kitchen,
      orderItems: [
        {
          ...ordered,
          menuItemSizeId: "size-l",
          sizeNameSnapshot: "كبير",
          unitPrice: 40,
        },
      ],
      menuItems: [
        menu({
          sizes: [
            {
              id: "size-l",
              sizeName: "كبير",
              price: 55,
              discountedPrice: null,
              depositAmount: 15,
              isActive: true,
            },
          ],
        }),
      ],
    });

    assert.equal(preview.kitchenAvailable, true);
    assert.equal(preview.items.length, 1);
    assert.equal(preview.items[0]?.unitPrice, 55);
    assert.equal(preview.items[0]?.quantity, 2);
    assert.equal(preview.items[0]?.customerNote, "من غير بصل");
    assert.equal(preview.items[0]?.menuItemSizeId, "size-l");
    assert.equal(preview.items[0]?.depositAmount, 15);
    assert.match(preview.notices[0] ?? "", /اتغير سعر/);
    assert.match(preview.notices[0] ?? "", /40 جنيه/);
    assert.match(preview.notices[0] ?? "", /55 جنيه/);
  });

  it("skips removed, unapproved, and inactive sizes", () => {
    const preview = buildReorderPreview({
      kitchen,
      orderItems: [
        ordered,
        {
          ...ordered,
          menuItemId: "gone",
          itemNameSnapshot: "ملوخية",
        },
        {
          ...ordered,
          menuItemId: "pending",
          itemNameSnapshot: "محشي",
        },
        {
          ...ordered,
          menuItemId: "sized",
          menuItemSizeId: "old-size",
          itemNameSnapshot: "فراخ",
          sizeNameSnapshot: "نص",
        },
      ],
      menuItems: [
        menu({ isAvailable: false }),
        menu({
          id: "pending",
          name: "محشي",
          approvalStatus: "PENDING",
        }),
        menu({
          id: "sized",
          name: "فراخ",
          sizes: [
            {
              id: "old-size",
              sizeName: "نص",
              price: 80,
              discountedPrice: null,
              depositAmount: null,
              isActive: false,
            },
          ],
        }),
      ],
    });

    assert.equal(preview.items.length, 0);
    assert.equal(preview.message, "مفيش أصناف من الطلب ده متاحة دلوقتي.");
    assert.equal(preview.removed.length, 4);
    assert.match(preview.notices.join("\n"), /ملوخية/);
    assert.match(preview.notices.join("\n"), /لسه مش معتمد/);
    assert.match(preview.notices.join("\n"), /الحجم مش متاح/);
  });

  it("explains a closed kitchen and does not return items", () => {
    const preview = buildReorderPreview({
      kitchen: { ...kitchen, availabilityStatus: "CLOSED" },
      orderItems: [ordered],
      menuItems: [menu()],
    });
    assert.equal(preview.kitchenAvailable, false);
    assert.match(preview.message ?? "", /مقفول/);
    assert.equal(preview.items.length, 0);
  });

  it("applies an active flash price without trusting the old snapshot", () => {
    const preview = buildReorderPreview({
      kitchen,
      orderItems: [{ ...ordered, unitPrice: 90 }],
      menuItems: [
        menu({
          basePrice: 90,
          flash: { offerPrice: 60, quantityLeft: 3 },
        }),
      ],
    });
    assert.equal(preview.items[0]?.unitPrice, 60);
    assert.equal(preview.items[0]?.priceChanged, true);
  });
});
