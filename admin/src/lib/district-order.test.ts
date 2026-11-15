import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compareDistrictNames, sortDistrictRows } from "./district-order";

describe("district order", () => {
  it("puts الأول through التاسع before other names, and حي آخر last", () => {
    const names = [
      "الحي التاسع",
      "دار مصر",
      "الحي الأول",
      "حي آخر",
      "جولف سيتي",
      "الحي الثاني",
      "حي السلام",
    ];
    const sorted = names.slice().sort(compareDistrictNames);
    assert.deepEqual(sorted, [
      "الحي الأول",
      "الحي الثاني",
      "الحي التاسع",
      "دار مصر",
      "جولف سيتي",
      "حي السلام",
      "حي آخر",
    ]);
  });

  it("uses sortOrder first, then the natural name when orders match", () => {
    const rows = [
      { regionName: "الحي الأول", sortOrder: 1000 },
      { regionName: "الحي التاسع", sortOrder: 1000 },
      { regionName: "دار مصر", sortOrder: 50 },
    ];
    assert.deepEqual(
      sortDistrictRows(rows).map((row) => row.regionName),
      ["دار مصر", "الحي الأول", "الحي التاسع"],
    );
  });
});
