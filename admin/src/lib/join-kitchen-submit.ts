import type { KitchenJoinLeadSegment } from "@prisma/client";

import {
  JOIN_KITCHEN_COPY,
  isKitchenJoinSegment,
  joinKitchenPhoneError,
  normalizeLeadSource,
} from "./kitchen-join-leads";
import { isValidEgyptianPhone, normalizeEgyptianPhone } from "./phone";
import type { RateLimiter } from "./rate-limit";

export type KitchenJoinLeadAlert = {
  id: string;
  fullName: string;
  district: string;
  segment: KitchenJoinLeadSegment;
  whatsapp: string;
  source: string | null;
};

export type KitchenJoinLeadStore = {
  findOpenByWhatsapp(whatsapp: string): Promise<{ id: string } | null>;
  create(data: {
    fullName: string;
    district: string;
    segment: KitchenJoinLeadSegment;
    whatsapp: string;
    source: string | null;
  }): Promise<{ id: string }>;
};

export type JoinKitchenSubmission = {
  fullName?: string;
  district?: string;
  segment?: string;
  whatsapp?: string;
  source?: string;
  /** Honeypot. People leave this empty; bots often fill it. */
  companyWebsite?: string;
};

export type JoinKitchenSubmitResult =
  | { ok: true; id: string }
  | {
      ok: false;
      status: number;
      error: string;
      retryAfterSeconds?: number;
    };

export async function submitJoinKitchenLead(
  input: JoinKitchenSubmission,
  deps: {
    ip: string;
    store: KitchenJoinLeadStore;
    notify: (lead: KitchenJoinLeadAlert) => Promise<void>;
    ipLimiter: RateLimiter;
    phoneLimiter: RateLimiter;
    now?: number;
  },
): Promise<JoinKitchenSubmitResult> {
  const now = deps.now ?? Date.now();
  const ipDecision = deps.ipLimiter.check(deps.ip || "unknown", now);
  if (!ipDecision.allowed) {
    return {
      ok: false,
      status: 429,
      error: JOIN_KITCHEN_COPY.rateLimited,
      retryAfterSeconds: ipDecision.retryAfterSeconds,
    };
  }

  if ((input.companyWebsite ?? "").trim()) {
    return { ok: false, status: 400, error: JOIN_KITCHEN_COPY.generic };
  }

  const fullName = input.fullName?.trim() ?? "";
  const district = input.district?.trim() ?? "";
  const segmentRaw = input.segment?.trim() ?? "";
  const whatsapp = normalizeEgyptianPhone(input.whatsapp ?? "");
  const source = normalizeLeadSource(input.source);

  if (!fullName || fullName.length < 2) {
    return { ok: false, status: 400, error: JOIN_KITCHEN_COPY.nameRequired };
  }
  if (fullName.length > 80) {
    return { ok: false, status: 400, error: JOIN_KITCHEN_COPY.nameTooLong };
  }

  if (!district) {
    return {
      ok: false,
      status: 400,
      error: JOIN_KITCHEN_COPY.districtRequired,
    };
  }
  if (district.length > 80) {
    return { ok: false, status: 400, error: JOIN_KITCHEN_COPY.districtTooLong };
  }

  if (!isKitchenJoinSegment(segmentRaw)) {
    return {
      ok: false,
      status: 400,
      error: JOIN_KITCHEN_COPY.segmentRequired,
    };
  }

  const phoneError = joinKitchenPhoneError(whatsapp);
  if (phoneError || !isValidEgyptianPhone(whatsapp)) {
    return {
      ok: false,
      status: 400,
      error: phoneError ?? JOIN_KITCHEN_COPY.phoneInvalid,
    };
  }

  const phoneDecision = deps.phoneLimiter.check(whatsapp, now);
  if (!phoneDecision.allowed) {
    return {
      ok: false,
      status: 429,
      error: JOIN_KITCHEN_COPY.rateLimited,
      retryAfterSeconds: phoneDecision.retryAfterSeconds,
    };
  }

  try {
    const existingOpen = await deps.store.findOpenByWhatsapp(whatsapp);
    if (existingOpen) {
      return { ok: false, status: 409, error: JOIN_KITCHEN_COPY.duplicate };
    }

    const lead = await deps.store.create({
      fullName,
      district,
      segment: segmentRaw,
      whatsapp,
      source,
    });

    try {
      await deps.notify({
        id: lead.id,
        fullName,
        district,
        segment: segmentRaw,
        whatsapp,
        source,
      });
    } catch (error) {
      console.error("[join-kitchen] alert failed", error);
    }

    return { ok: true, id: lead.id };
  } catch (error) {
    console.error("[join-kitchen] save failed", error);
    return { ok: false, status: 500, error: JOIN_KITCHEN_COPY.generic };
  }
}
