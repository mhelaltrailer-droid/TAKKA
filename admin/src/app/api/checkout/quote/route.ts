import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { buildCheckoutQuote } from "@/lib/checkout-quote";
import { parseCheckoutPayload } from "@/lib/checkout-quote-model";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const parsed = parseCheckoutPayload(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const quote = await buildCheckoutQuote(parsed.value);
    return NextResponse.json(quote.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر مراجعة الطلب.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
