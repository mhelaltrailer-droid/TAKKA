import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { notifyKitchenJoinLead } from "./kitchen-join-alert";
import type { KitchenJoinLeadAlert } from "./join-kitchen-submit";

const lead: KitchenJoinLeadAlert = {
  id: "lead_1",
  fullName: "منى أحمد",
  district: "الحي الأول",
  segment: "HOME_COOK",
  whatsapp: "01012345678",
  source: "ig_bio",
};

const originalFetch = globalThis.fetch;
const envKeys = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "JOIN_KITCHEN_ALERT_WEBHOOK_URL",
  "JOIN_KITCHEN_ALERT_WEBHOOK_SECRET",
] as const;

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of envKeys) delete process.env[key];
});

describe("notifyKitchenJoinLead", () => {
  it("does nothing when alert env vars are missing", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("ok");
    };
    await notifyKitchenJoinLead(lead);
    assert.equal(calls, 0);
  });

  it("posts to Telegram and a webhook when configured", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:token";
    process.env.TELEGRAM_CHAT_ID = "555";
    process.env.JOIN_KITCHEN_ALERT_WEBHOOK_URL = "https://alerts.example/hook";
    process.env.JOIN_KITCHEN_ALERT_WEBHOOK_SECRET = "shh";

    const calls: { url: string; headers: Headers; body: string }[] = [];
    globalThis.fetch = async (input, init) => {
      calls.push({
        url: String(input),
        headers: new Headers(init?.headers),
        body: String(init?.body ?? ""),
      });
      return new Response("ok");
    };

    await notifyKitchenJoinLead(lead);
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /^https:\/\/api\.telegram\.org\/bot123:token\/sendMessage$/);
    assert.match(calls[0].body, /ig_bio/);
    assert.equal(calls[1].url, "https://alerts.example/hook");
    assert.equal(calls[1].headers.get("authorization"), "Bearer shh");
    assert.match(calls[1].body, /kitchen_join_lead.created/);
  });

  it("stays quiet when delivery fails", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:token";
    process.env.TELEGRAM_CHAT_ID = "555";
    globalThis.fetch = async () => {
      throw new Error("network down");
    };
    await notifyKitchenJoinLead(lead);
  });
});
