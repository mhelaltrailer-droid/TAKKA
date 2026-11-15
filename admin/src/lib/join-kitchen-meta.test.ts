import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  JOIN_KITCHEN_COPY,
  KITCHEN_JOIN_SEGMENTS,
  KITCHEN_JOIN_SOURCE_UNKNOWN,
  kitchenJoinSourceLabel,
} from "./kitchen-join-leads";
import {
  JOIN_KITCHEN_DESCRIPTION,
  JOIN_KITCHEN_OG_IMAGE,
  JOIN_KITCHEN_ORIGIN,
  JOIN_KITCHEN_TITLE,
  JOIN_KITCHEN_URL,
} from "./join-kitchen-meta";

describe("join-kitchen public copy", () => {
  it("uses the share title and description without a city name", () => {
    assert.equal(JOIN_KITCHEN_TITLE, "أكلك حلو؟ مكانك معانا | تكة");
    assert.equal(
      JOIN_KITCHEN_DESCRIPTION,
      "الأكل البيتي كله على تكة. سجّلي مطبخك من البيت، وفريق تكة هيتواصل معاكي على واتساب.",
    );
    assert.equal(JOIN_KITCHEN_DESCRIPTION.includes("العبور"), false);
    assert.equal(JOIN_KITCHEN_TITLE.includes("العبور"), false);
    assert.equal(JOIN_KITCHEN_ORIGIN, "https://takka-app.onrender.com");
    assert.equal(JOIN_KITCHEN_URL, "https://takka-app.onrender.com/join-kitchen");
    assert.equal(
      JOIN_KITCHEN_OG_IMAGE,
      "https://takka-app.onrender.com/og/join-kitchen.png",
    );
  });

  it("keeps validation copy feminine and colloquial", () => {
    const blob = Object.values(JOIN_KITCHEN_COPY).join("\n");
    assert.equal(blob.includes("توافقين"), false);
    assert.equal(blob.includes("معاكِ"), false);
    assert.equal(blob.includes("ارباح"), false);
    assert.equal(
      KITCHEN_JOIN_SEGMENTS.find((item) => item.value === "BEGINNER")?.label,
      "بفكّر أبدأ",
    );
  });
});

describe("kitchenJoinSourceLabel", () => {
  it("maps known src codes to Arabic labels", () => {
    assert.equal(kitchenJoinSourceLabel("fb_page"), "صفحة فيسبوك");
    assert.equal(kitchenJoinSourceLabel("ig_bio"), "بايو إنستجرام");
    assert.equal(kitchenJoinSourceLabel("tiktok_bio"), "بايو تيك توك");
    assert.equal(
      kitchenJoinSourceLabel("fb_group_obour"),
      "جروب العبور على فيسبوك",
    );
    assert.equal(
      kitchenJoinSourceLabel("fb_group_food"),
      "جروبات أكل على فيسبوك",
    );
    assert.equal(kitchenJoinSourceLabel("whatsapp"), "واتساب");
    assert.equal(kitchenJoinSourceLabel("wa_business"), "واتساب بيزنس");
    assert.equal(kitchenJoinSourceLabel("organic_post"), "بوست");
  });

  it("keeps unknown codes and uses the missing-src fallback", () => {
    assert.equal(kitchenJoinSourceLabel("radio_ad"), "radio_ad");
    assert.equal(kitchenJoinSourceLabel(null), KITCHEN_JOIN_SOURCE_UNKNOWN);
    assert.equal(kitchenJoinSourceLabel(""), KITCHEN_JOIN_SOURCE_UNKNOWN);
    assert.equal(kitchenJoinSourceLabel("   "), KITCHEN_JOIN_SOURCE_UNKNOWN);
    assert.equal(KITCHEN_JOIN_SOURCE_UNKNOWN, "مباشر / غير معروف");
  });
});
