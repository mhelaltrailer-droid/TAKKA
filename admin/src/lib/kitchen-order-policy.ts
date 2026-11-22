import { db } from "@/lib/db";
import {
  KITCHEN_ORDER_POLICY_DEFAULTS,
  KITCHEN_ORDER_POLICY_ID,
  type KitchenOrderPolicyValues,
  parseKitchenOrderPolicyInput,
} from "@/lib/kitchen-order-rules";

const CACHE_MS = 15_000;

let cached: { value: KitchenOrderPolicyValues; expiresAt: number } | null =
  null;

export function clearKitchenOrderPolicyCache() {
  cached = null;
}

function fromRow(row: {
  acceptanceTimeoutMinutes: number;
  shortWindowCount: number;
  shortWindowHours: number;
  longWindowCount: number;
  longWindowDays: number;
  customerNoResponseMessage: string;
  level1SuspensionMessage: string;
  level2SuspensionMessage: string;
}): KitchenOrderPolicyValues {
  return {
    acceptanceTimeoutMinutes: row.acceptanceTimeoutMinutes,
    shortWindowCount: row.shortWindowCount,
    shortWindowHours: row.shortWindowHours,
    longWindowCount: row.longWindowCount,
    longWindowDays: row.longWindowDays,
    customerNoResponseMessage: row.customerNoResponseMessage,
    level1SuspensionMessage: row.level1SuspensionMessage,
    level2SuspensionMessage: row.level2SuspensionMessage,
  };
}

export async function getKitchenOrderPolicy(): Promise<KitchenOrderPolicyValues> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const existing = await db.kitchenOrderPolicy.findUnique({
    where: { id: KITCHEN_ORDER_POLICY_ID },
  });

  let row = existing;
  if (!row) {
    try {
      row = await db.kitchenOrderPolicy.create({
        data: {
          id: KITCHEN_ORDER_POLICY_ID,
          ...KITCHEN_ORDER_POLICY_DEFAULTS,
        },
      });
    } catch {
      row = await db.kitchenOrderPolicy.findUnique({
        where: { id: KITCHEN_ORDER_POLICY_ID },
      });
    }
  }

  if (!row) {
    throw new Error("Kitchen order policy is unavailable.");
  }

  const value = fromRow(row);
  cached = { value, expiresAt: Date.now() + CACHE_MS };
  return value;
}

export async function saveKitchenOrderPolicy(
  raw: Record<string, unknown>,
): Promise<
  { ok: true; value: KitchenOrderPolicyValues } | { ok: false; error: string }
> {
  const parsed = parseKitchenOrderPolicyInput(raw);
  if (!parsed.ok) {
    return parsed;
  }

  const row = await db.kitchenOrderPolicy.upsert({
    where: { id: KITCHEN_ORDER_POLICY_ID },
    create: {
      id: KITCHEN_ORDER_POLICY_ID,
      ...parsed.value,
    },
    update: parsed.value,
  });
  const value = fromRow(row);
  cached = { value, expiresAt: Date.now() + CACHE_MS };
  return { ok: true, value };
}
