import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JOIN_KITCHEN_COPY, KITCHEN_JOIN_SEGMENTS } from "./kitchen-join-leads";
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
