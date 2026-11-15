import { kitchenJoinSegmentLabel } from "./kitchen-join-leads";
import type { KitchenJoinLeadAlert } from "./join-kitchen-submit";

const ALERT_TIMEOUT_MS = 4_000;

function telegramConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
  if (!token || !chatId) return null;
  return { token, chatId };
}

function webhookConfig(): { url: string; secret: string } | null {
  const url = process.env.JOIN_KITCHEN_ALERT_WEBHOOK_URL?.trim() ?? "";
  if (!url) return null;
  return {
    url,
    secret: process.env.JOIN_KITCHEN_ALERT_WEBHOOK_SECRET?.trim() ?? "",
  };
}

function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `20${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

function alertText(lead: KitchenJoinLeadAlert): string {
  return [
    "ليد جديدة — انضمام مطبخ",
    `الاسم: ${lead.fullName}`,
    `الحي: ${lead.district}`,
    `النوع: ${kitchenJoinSegmentLabel(lead.segment)}`,
    `واتساب: ${lead.whatsapp}`,
    `المصدر: ${lead.source ?? "—"}`,
    whatsappLink(lead.whatsapp),
  ].join("\n");
}

async function postJson(url: string, body: unknown, headers: HeadersInit) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`alert HTTP ${response.status}`);
  }
}

/**
 * Tells the team a lead arrived. No-ops when Telegram and the webhook
 * are unset, and never throws — saving the lead is the important part.
 */
export async function notifyKitchenJoinLead(
  lead: KitchenJoinLeadAlert,
): Promise<void> {
  const telegram = telegramConfig();
  const webhook = webhookConfig();
  if (!telegram && !webhook) return;

  const jobs: Promise<void>[] = [];

  if (telegram) {
    jobs.push(
      postJson(
        `https://api.telegram.org/bot${telegram.token}/sendMessage`,
        {
          chat_id: telegram.chatId,
          text: alertText(lead),
          disable_web_page_preview: true,
        },
        {},
      ),
    );
  }

  if (webhook) {
    jobs.push(
      postJson(
        webhook.url,
        {
          event: "kitchen_join_lead.created",
          lead: {
            id: lead.id,
            fullName: lead.fullName,
            district: lead.district,
            segment: lead.segment,
            whatsapp: lead.whatsapp,
            source: lead.source,
          },
        },
        webhook.secret ? { Authorization: `Bearer ${webhook.secret}` } : {},
      ),
    );
  }

  const results = await Promise.allSettled(jobs);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[join-kitchen] alert delivery failed", result.reason);
    }
  }
}
