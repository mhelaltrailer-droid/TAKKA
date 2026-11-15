import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isValidEgyptianPhone,
  normalizeEgyptianPhone,
  phoneValidationMessage,
} from "./phone";

describe("normalizeEgyptianPhone", () => {
  const expected = "01012345678";

  it("keeps a local 01 number", () => {
    assert.equal(normalizeEgyptianPhone("01012345678"), expected);
    assert.equal(normalizeEgyptianPhone("010-1234-5678"), expected);
    assert.equal(normalizeEgyptianPhone("010 1234 5678"), expected);
  });

  it("accepts +20, 0020, and 20 prefixes", () => {
    assert.equal(normalizeEgyptianPhone("+201012345678"), expected);
    assert.equal(normalizeEgyptianPhone("+20 101 234 5678"), expected);
    assert.equal(normalizeEgyptianPhone("00201012345678"), expected);
    assert.equal(normalizeEgyptianPhone("201012345678"), expected);
    assert.equal(normalizeEgyptianPhone("+2001012345678"), expected);
  });

  it("converts Arabic-Indic and Persian digits", () => {
    assert.equal(normalizeEgyptianPhone("٠١٠١٢٣٤٥٦٧٨"), expected);
    assert.equal(normalizeEgyptianPhone("۰۱۰۱۲۳۴۵۶۷۸"), expected);
    assert.equal(normalizeEgyptianPhone("+٢٠١٠١٢٣٤٥٦٧٨"), expected);
  });

  it("still validates as an Egyptian mobile after normalization", () => {
    assert.equal(isValidEgyptianPhone("+201012345678"), true);
    assert.equal(phoneValidationMessage("٢٠١٠١٢٣٤٥٦٧٨"), null);
    assert.equal(isValidEgyptianPhone("12345"), false);
  });
});
