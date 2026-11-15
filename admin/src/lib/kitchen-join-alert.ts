import nodemailer from "nodemailer";

import {
  kitchenJoinSegmentLabel,
  kitchenJoinSourceLabel,
} from "./kitchen-join-leads";
import type { KitchenJoinLeadAlert } from "./join-kitchen-submit";

const ALERT_TIMEOUT_MS = 4_000;
const DEFAULT_EMAIL_TO = "takkaapp.eg@gmail.com";
const DEFAULT_ADMIN_ORIGIN = "https://takka-admin.onrender.com";
const CAIRO_TZ = "Africa/Cairo";

export type SmtpAlertConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
};

export type KitchenJoinAlertEmail = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
};

type EnvBag = Record<string, string | undefined>;

/** SMTP + recipient. Returns null when any required var is missing. */
export function smtpAlertConfig(
  env: EnvBag = process.env,
): SmtpAlertConfig | null {
  const host = env.SMTP_HOST?.trim() ?? "";
  const portRaw = env.SMTP_PORT?.trim() ?? "";
  const user = env.SMTP_USER?.trim() ?? "";
  const pass = env.SMTP_PASS?.trim() ?? "";
  const from = env.SMTP_FROM?.trim() || user;
  const to = env.JOIN_KITCHEN_ALERT_EMAIL_TO?.trim() || DEFAULT_EMAIL_TO;

  if (!host || !portRaw || !user || !pass || !from || !to) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) return null;

  const secureFlag = env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureFlag === "true" ||
    secureFlag === "1" ||
    (secureFlag !== "false" && secureFlag !== "0" && port === 465);

  return { host, port, secure, user, pass, from, to };
}

export function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `20${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

export function adminLeadsDashboardUrl(env: EnvBag = process.env): string {
  const base = (
    env.JOIN_KITCHEN_ALERT_ADMIN_URL?.trim() ||
    env.ADMIN_BASE_URL?.trim() ||
    DEFAULT_ADMIN_ORIGIN
  ).replace(/\/$/, "");
  return `${base}/dashboard/admin/leads`;
}

export function formatCairoDateTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: CAIRO_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function buildKitchenJoinAlertEmail(
  lead: KitchenJoinLeadAlert,
  options: {
    to: string;
    from: string;
    now?: Date;
    adminUrl?: string;
  },
): KitchenJoinAlertEmail {
  const when = formatCairoDateTime(options.now ?? new Date());
  const segment = kitchenJoinSegmentLabel(lead.segment);
  const wa = whatsappLink(lead.whatsapp);
  const adminUrl = options.adminUrl ?? adminLeadsDashboardUrl();
  const sourceLabel = kitchenJoinSourceLabel(lead.source);
  const sourceCode = lead.source?.trim() || null;
  const sourceDetail = sourceCode
    ? sourceLabel === sourceCode
      ? sourceCode
      : `${sourceLabel} (${sourceCode})`
    : sourceLabel;

  const subject = `طلب انضمام مطبخ جديد – ${sourceLabel} – تكة`;
  const text = [
    "طلب انضمام مطبخ جديد على تكة",
    `المصدر: ${sourceDetail}`,
    "",
    `الاسم: ${lead.fullName}`,
    `الحي: ${lead.district}`,
    `النوع: ${segment}`,
    `واتساب: ${lead.whatsapp}`,
    `رابط واتساب: ${wa}`,
    `الوقت (القاهرة): ${when}`,
    "",
    `لوحة الليدز: ${adminUrl}`,
  ].join("\n");

  const html = `
<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.7;color:#5C3016">
  <p style="font-size:16px;font-weight:700;margin:0 0 4px">طلب انضمام مطبخ جديد على تكة</p>
  <p style="margin:0 0 12px;font-size:15px"><strong>المصدر:</strong> ${escapeHtml(sourceDetail)}</p>
  <ul style="padding-inline-start:18px;margin:0">
    <li><strong>الاسم:</strong> ${escapeHtml(lead.fullName)}</li>
    <li><strong>الحي:</strong> ${escapeHtml(lead.district)}</li>
    <li><strong>النوع:</strong> ${escapeHtml(segment)}</li>
    <li><strong>واتساب:</strong> ${escapeHtml(lead.whatsapp)} — <a href="${escapeHtml(wa)}">${escapeHtml(wa)}</a></li>
    <li><strong>الوقت (القاهرة):</strong> ${escapeHtml(when)}</li>
  </ul>
  <p style="margin:16px 0 0">
    <a href="${escapeHtml(adminUrl)}">فتح لوحة ليدز انضمام المطابخ</a>
  </p>
</div>
`.trim();

  return {
    to: options.to,
    from: options.from,
    subject,
    text,
    html,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function alertText(lead: KitchenJoinLeadAlert): string {
  const sourceLabel = kitchenJoinSourceLabel(lead.source);
  const sourceCode = lead.source?.trim();
  const sourceLine =
    sourceCode && sourceLabel !== sourceCode
      ? `${sourceLabel} (${sourceCode})`
      : sourceLabel;
  return [
    "ليد جديدة — انضمام مطبخ",
    `المصدر: ${sourceLine}`,
    `الاسم: ${lead.fullName}`,
    `الحي: ${lead.district}`,
    `النوع: ${kitchenJoinSegmentLabel(lead.segment)}`,
    `واتساب: ${lead.whatsapp}`,
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

async function sendAlertEmail(
  lead: KitchenJoinLeadAlert,
  smtp: SmtpAlertConfig,
  sendMail?: (mail: KitchenJoinAlertEmail) => Promise<void>,
) {
  const mail = buildKitchenJoinAlertEmail(lead, {
    to: smtp.to,
    from: smtp.from,
  });

  if (sendMail) {
    await sendMail(mail);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
    connectionTimeout: ALERT_TIMEOUT_MS,
    greetingTimeout: ALERT_TIMEOUT_MS,
    socketTimeout: ALERT_TIMEOUT_MS,
  });

  await transporter.sendMail({
    from: mail.from,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

export type NotifyKitchenJoinLeadOptions = {
  sendMail?: (mail: KitchenJoinAlertEmail) => Promise<void>;
  env?: EnvBag;
};

/**
 * Primary: email over SMTP when configured.
 * Optional extras: Telegram bot and/or webhook.
 * Never throws — saving the lead is the important part.
 */
export async function notifyKitchenJoinLead(
  lead: KitchenJoinLeadAlert,
  options: NotifyKitchenJoinLeadOptions = {},
): Promise<void> {
  const env = options.env ?? process.env;
  const smtp = smtpAlertConfig(env);
  const telegramToken = env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const telegramChatId = env.TELEGRAM_CHAT_ID?.trim() ?? "";
  const telegram =
    telegramToken && telegramChatId
      ? { token: telegramToken, chatId: telegramChatId }
      : null;
  const webhookUrl = env.JOIN_KITCHEN_ALERT_WEBHOOK_URL?.trim() ?? "";
  const webhook = webhookUrl
    ? {
        url: webhookUrl,
        secret: env.JOIN_KITCHEN_ALERT_WEBHOOK_SECRET?.trim() ?? "",
      }
    : null;

  if (!smtp && !telegram && !webhook) return;

  const jobs: Promise<void>[] = [];

  if (smtp) {
    jobs.push(sendAlertEmail(lead, smtp, options.sendMail));
  }

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
