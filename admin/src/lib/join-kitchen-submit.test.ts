import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JOIN_KITCHEN_COPY } from "./kitchen-join-leads";
import {
  submitJoinKitchenLead,
  type KitchenJoinLeadAlert,
  type KitchenJoinLeadStore,
} from "./join-kitchen-submit";
import { createMemoryRateLimiter } from "./rate-limit";

const SECRET = "postgres://user:secret-db-password@localhost/takka";

function harness(options?: { existing?: boolean; explode?: boolean }) {
  const created: unknown[] = [];
  const alerts: KitchenJoinLeadAlert[] = [];
  const store: KitchenJoinLeadStore = {
    async findOpenByWhatsapp() {
      return options?.existing ? { id: "lead_old" } : null;
    },
    async create(data) {
      if (options?.explode) {
        throw new Error(SECRET);
      }
      created.push(data);
      return { id: "lead_new" };
    },
  };
  return { created, alerts, store };
}

function limits() {
  return {
    ipLimiter: createMemoryRateLimiter({ limit: 2, windowMs: 60_000 }),
    phoneLimiter: createMemoryRateLimiter({ limit: 2, windowMs: 60_000 }),
  };
}

const valid = {
  fullName: "منى أحمد",
  district: "الحي الأول",
  segment: "HOME_COOK",
  whatsapp: "+20 101 234 5678",
  source: "fb_page",
};

describe("submitJoinKitchenLead", () => {
  it("normalizes the phone, saves the lead, and notifies", async () => {
    const { created, alerts, store } = harness();
    const result = await submitJoinKitchenLead(valid, {
      ip: "203.0.113.8",
      store,
      notify: async (lead) => {
        alerts.push(lead);
      },
      ...limits(),
    });
    assert.deepEqual(result, { ok: true, id: "lead_new" });
    assert.equal(created.length, 1);
    assert.equal(
      (created[0] as { whatsapp: string }).whatsapp,
      "01012345678",
    );
    assert.equal(alerts[0]?.whatsapp, "01012345678");
    assert.equal(alerts[0]?.source, "fb_page");
  });

  it("rejects a filled honeypot without saving", async () => {
    const { created, store } = harness();
    const result = await submitJoinKitchenLead(
      { ...valid, companyWebsite: "https://spam.example" },
      {
        ip: "203.0.113.9",
        store,
        notify: async () => {
          throw new Error("should not notify");
        },
        ...limits(),
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 400);
    assert.equal(created.length, 0);
  });

  it("rejects rapid repeats from the same IP and the same phone", async () => {
    const { store } = harness();
    const ipLimiter = createMemoryRateLimiter({ limit: 2, windowMs: 60_000 });
    const phoneLimiter = createMemoryRateLimiter({
      limit: 2,
      windowMs: 60_000,
    });
    const deps = {
      ip: "203.0.113.10",
      store,
      notify: async () => {},
      ipLimiter,
      phoneLimiter,
    };
    assert.equal((await submitJoinKitchenLead(valid, deps)).ok, true);
    assert.equal(
      (
        await submitJoinKitchenLead(
          { ...valid, whatsapp: "01000000000" },
          deps,
        )
      ).ok,
      true,
    );
    const blockedIp = await submitJoinKitchenLead(
      { ...valid, whatsapp: "01111111111" },
      deps,
    );
    assert.equal(blockedIp.ok, false);
    if (!blockedIp.ok) {
      assert.equal(blockedIp.status, 429);
      assert.equal(blockedIp.error, JOIN_KITCHEN_COPY.rateLimited);
    }

    const phoneDeps = {
      ...deps,
      ip: "203.0.113.11",
      ipLimiter: createMemoryRateLimiter({ limit: 10, windowMs: 60_000 }),
      phoneLimiter: createMemoryRateLimiter({ limit: 1, windowMs: 60_000 }),
    };
    assert.equal((await submitJoinKitchenLead(valid, phoneDeps)).ok, true);
    const blockedPhone = await submitJoinKitchenLead(
      { ...valid, fullName: "سارة" },
      { ...phoneDeps, ip: "198.51.100.4" },
    );
    assert.equal(blockedPhone.ok, false);
    if (!blockedPhone.ok) assert.equal(blockedPhone.status, 429);
  });

  it("does not leak internal errors", async () => {
    const { store } = harness({ explode: true });
    const result = await submitJoinKitchenLead(valid, {
      ip: "203.0.113.12",
      store,
      notify: async () => {},
      ...limits(),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 500);
      assert.equal(result.error, JOIN_KITCHEN_COPY.generic);
      assert.equal(result.error.includes("secret"), false);
      assert.equal(JSON.stringify(result).includes(SECRET), false);
    }
  });

  it("accepts Arabic-Indic digits and reports an open duplicate", async () => {
    const { store } = harness({ existing: true });
    const result = await submitJoinKitchenLead(
      { ...valid, whatsapp: "٠١٠١٢٣٤٥٦٧٨" },
      {
        ip: "203.0.113.13",
        store,
        notify: async () => {},
        ...limits(),
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 409);
      assert.equal(result.error, JOIN_KITCHEN_COPY.duplicate);
    }
  });
});
