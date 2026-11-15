import { NextResponse } from "next/server";

import { notifyKitchenJoinLead } from "@/lib/kitchen-join-alert";
import { JOIN_KITCHEN_COPY } from "@/lib/kitchen-join-leads";
import { prismaKitchenJoinLeadStore } from "@/lib/kitchen-join-lead-store";
import {
  submitJoinKitchenLead,
  type JoinKitchenSubmission,
} from "@/lib/join-kitchen-submit";
import {
  clientIpFromRequest,
  joinKitchenIpLimiter,
  joinKitchenPhoneLimiter,
} from "@/lib/rate-limit";

/**
 * Public: capture kitchen supply interest from /join-kitchen.
 */
export async function POST(request: Request) {
  try {
    const raw = (await request.json().catch(() => ({}))) as
      | JoinKitchenSubmission
      | null;
    const payload =
      raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

    const result = await submitJoinKitchenLead(payload, {
      ip: clientIpFromRequest(request),
      store: prismaKitchenJoinLeadStore,
      notify: notifyKitchenJoinLead,
      ipLimiter: joinKitchenIpLimiter,
      phoneLimiter: joinKitchenPhoneLimiter,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        {
          status: result.status,
          headers: result.retryAfterSeconds
            ? { "Retry-After": String(result.retryAfterSeconds) }
            : undefined,
        },
      );
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error("[join-kitchen] request failed", error);
    return NextResponse.json(
      { error: JOIN_KITCHEN_COPY.generic },
      { status: 500 },
    );
  }
}
