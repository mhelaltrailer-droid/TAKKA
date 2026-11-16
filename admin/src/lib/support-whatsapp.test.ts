import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_SUPPORT_WHATSAPP_NUMBER,
  buildOrderSupportMessage,
  resolveSupportWhatsappNumber,
  supportWhatsappUrl,
} from "./support-whatsapp";

describe("resolveSupportWhatsappNumber", () => {
  it("uses the Takka default when the env var is missing", () => {
    assert.equal(resolveSupportWhatsappNumber({}), DEFAULT_SUPPORT_WHATSAPP_NUMBER);
    assert.equal(
      resolveSupportWhatsappNumber({ SUPPORT_WHATSAPP_NUMBER: "   " }),
      "+201515327198",
    );
  });

  it("accepts international, 00, and Egyptian local forms", () => {
    assert.equal(
      resolveSupportWhatsappNumber({
        SUPPORT_WHATSAPP_NUMBER: "01515327198",
      }),
      "+201515327198",
    );
    assert.equal(
      resolveSupportWhatsappNumber({
        SUPPORT_WHATSAPP_NUMBER: "00201000000000",
      }),
      "+201000000000",
    );
    assert.equal(
      resolveSupportWhatsappNumber({
        SUPPORT_WHATSAPP_NUMBER: "+1 202 555 0143",
      }),
      "+12025550143",
    );
  });

  it("falls back when the value is not a phone number", () => {
    assert.equal(
      resolveSupportWhatsappNumber({ SUPPORT_WHATSAPP_NUMBER: "takka" }),
      DEFAULT_SUPPORT_WHATSAPP_NUMBER,
    );
  });
});

describe("buildOrderSupportMessage", () => {
  it("includes the order number, kitchen, and problem, and skips an empty note", () => {
    const message = buildOrderSupportMessage({
      orderNumber: "TK-15",
      kitchenName: "مطبخ هدى",
      problemLabel: "ناقص صنف",
      note: "   ",
    });
    assert.match(message, /TK-15/);
    assert.match(message, /مطبخ هدى/);
    assert.match(message, /ناقص صنف/);
    assert.equal(message.includes("تفاصيل"), false);
  });

  it("builds a wa.me link without sending anything", () => {
    const message = buildOrderSupportMessage({
      orderNumber: "TK-15",
      kitchenName: "مطبخ هدى",
      problemLabel: "اتأخر",
      note: "الساعة 8",
    });
    const url = new URL(
      supportWhatsappUrl(DEFAULT_SUPPORT_WHATSAPP_NUMBER, message),
    );
    assert.equal(url.hostname, "wa.me");
    assert.equal(url.pathname, "/201515327198");
    assert.match(url.searchParams.get("text") ?? "", /الساعة 8/);
  });
});
