import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  adminLeadsDashboardUrl,
  buildKitchenJoinAlertEmail,
  notifyKitchenJoinLead,
  smtpAlertConfig,
} from "./kitchen-join-alert";
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
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "SMTP_SECURE",
  "JOIN_KITCHEN_ALERT_EMAIL_TO",
  "JOIN_KITCHEN_ALERT_ADMIN_URL",
  "ADMIN_BASE_URL",
] as const;

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of envKeys) delete process.env[key];
});

describe("smtpAlertConfig", () => {
  it("skips when SMTP env vars are incomplete", () => {
    assert.equal(smtpAlertConfig({}), null);
    assert.equal(
      smtpAlertConfig({
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: "465",
        SMTP_USER: "takkaapp.eg@gmail.com",
      }),
      null,
    );
  });

  it("defaults the recipient to takkaapp.eg@gmail.com and marks 465 as secure", () => {
    const config = smtpAlertConfig({
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PORT: "465",
      SMTP_USER: "takkaapp.eg@gmail.com",
      SMTP_PASS: "app-password",
      SMTP_FROM: "تكة <takkaapp.eg@gmail.com>",
    });
    assert.deepEqual(config, {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      user: "takkaapp.eg@gmail.com",
      pass: "app-password",
      from: "تكة <takkaapp.eg@gmail.com>",
      to: "takkaapp.eg@gmail.com",
    });
  });

  it("honors JOIN_KITCHEN_ALERT_EMAIL_TO and SMTP_SECURE=false on 587", () => {
    const config = smtpAlertConfig({
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
      SMTP_USER: "takkaapp.eg@gmail.com",
      SMTP_PASS: "app-password",
      JOIN_KITCHEN_ALERT_EMAIL_TO: "ops@example.com",
    });
    assert.equal(config?.to, "ops@example.com");
    assert.equal(config?.from, "takkaapp.eg@gmail.com");
    assert.equal(config?.secure, false);
  });
});

describe("buildKitchenJoinAlertEmail", () => {
  it("builds an Arabic subject and body with WhatsApp, src, Cairo time, and admin link", () => {
    const mail = buildKitchenJoinAlertEmail(lead, {
      to: "takkaapp.eg@gmail.com",
      from: "تكة <takkaapp.eg@gmail.com>",
      now: new Date("2026-11-15T14:30:00.000Z"),
      adminUrl: "https://takka-admin.onrender.com/dashboard/admin/leads",
    });

    assert.equal(mail.subject, "طلب انضمام مطبخ جديد – تكة");
    assert.equal(mail.to, "takkaapp.eg@gmail.com");
    assert.match(mail.text, /منى أحمد/);
    assert.match(mail.text, /الحي الأول/);
    assert.match(mail.text, /ست بيت/);
    assert.match(mail.text, /01012345678/);
    assert.match(mail.text, /https:\/\/wa\.me\/201012345678/);
    assert.match(mail.text, /ig_bio/);
    assert.match(mail.text, /القاهرة/);
    assert.match(
      mail.text,
      /https:\/\/takka-admin\.onrender\.com\/dashboard\/admin\/leads/,
    );
    assert.match(mail.html, /dir="rtl"/);
    assert.match(mail.html, /https:\/\/wa\.me\/201012345678/);
  });

  it("uses the default admin leads URL", () => {
    assert.equal(
      adminLeadsDashboardUrl({}),
      "https://takka-admin.onrender.com/dashboard/admin/leads",
    );
  });
});

describe("notifyKitchenJoinLead", () => {
  it("does nothing when alert env vars are missing", async () => {
    let calls = 0;
    let mails = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("ok");
    };
    await notifyKitchenJoinLead(lead, {
      env: {},
      sendMail: async () => {
        mails += 1;
      },
    });
    assert.equal(calls, 0);
    assert.equal(mails, 0);
  });

  it("sends email as the primary channel and keeps Telegram/webhook optional", async () => {
    const mails: { subject: string; to: string; text: string }[] = [];
    const calls: { url: string; headers: Headers; body: string }[] = [];
    globalThis.fetch = async (input, init) => {
      calls.push({
        url: String(input),
        headers: new Headers(init?.headers),
        body: String(init?.body ?? ""),
      });
      return new Response("ok");
    };

    await notifyKitchenJoinLead(lead, {
      env: {
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: "465",
        SMTP_USER: "takkaapp.eg@gmail.com",
        SMTP_PASS: "app-password",
        SMTP_FROM: "تكة <takkaapp.eg@gmail.com>",
        JOIN_KITCHEN_ALERT_EMAIL_TO: "takkaapp.eg@gmail.com",
        TELEGRAM_BOT_TOKEN: "123:token",
        TELEGRAM_CHAT_ID: "555",
        JOIN_KITCHEN_ALERT_WEBHOOK_URL: "https://alerts.example/hook",
        JOIN_KITCHEN_ALERT_WEBHOOK_SECRET: "shh",
      },
      sendMail: async (mail) => {
        mails.push({
          subject: mail.subject,
          to: mail.to,
          text: mail.text,
        });
      },
    });

    assert.equal(mails.length, 1);
    assert.equal(mails[0].subject, "طلب انضمام مطبخ جديد – تكة");
    assert.equal(mails[0].to, "takkaapp.eg@gmail.com");
    assert.match(mails[0].text, /ig_bio/);
    assert.equal(calls.length, 2);
    assert.match(
      calls[0].url,
      /^https:\/\/api\.telegram\.org\/bot123:token\/sendMessage$/,
    );
    assert.equal(calls[1].url, "https://alerts.example/hook");
    assert.equal(calls[1].headers.get("authorization"), "Bearer shh");
  });

  it("skips email when SMTP is incomplete even if Telegram is set", async () => {
    let mails = 0;
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("ok");
    };
    await notifyKitchenJoinLead(lead, {
      env: {
        SMTP_HOST: "smtp.gmail.com",
        TELEGRAM_BOT_TOKEN: "123:token",
        TELEGRAM_CHAT_ID: "555",
      },
      sendMail: async () => {
        mails += 1;
      },
    });
    assert.equal(mails, 0);
    assert.equal(calls, 1);
  });

  it("stays quiet when delivery fails", async () => {
    globalThis.fetch = async () => {
      throw new Error("network down");
    };
    await notifyKitchenJoinLead(lead, {
      env: {
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: "465",
        SMTP_USER: "takkaapp.eg@gmail.com",
        SMTP_PASS: "app-password",
        TELEGRAM_BOT_TOKEN: "123:token",
        TELEGRAM_CHAT_ID: "555",
      },
      sendMail: async () => {
        throw new Error("smtp down");
      },
    });
  });
});
