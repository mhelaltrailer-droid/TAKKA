import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DISCOVERY_CACHE_SETTINGS_DEFAULTS,
  parseDiscoveryCacheSettingsInput,
} from "./discovery-cache-settings";
import {
  pickTopDishes,
  type DiscoveryMenuCandidate,
} from "./discovery-feed-ranking";
import { TtlCache } from "./ttl-cache";

function dish(
  overrides: Partial<DiscoveryMenuCandidate> &
    Pick<DiscoveryMenuCandidate, "id">,
): DiscoveryMenuCandidate {
  return {
    kitchenId: "k1",
    name: overrides.name ?? overrides.id,
    description: null,
    imageUrl: null,
    categoryId: "meals",
    basePrice: { toString: () => "50" },
    isDishOfTheDay: false,
    dishOfTheDayPrice: null,
    dishOfTheDayQty: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("parseDiscoveryCacheSettingsInput", () => {
  it("accepts defaults-shaped input", () => {
    const parsed = parseDiscoveryCacheSettingsInput({
      cacheEnabled: "on",
      ttlSeconds: "60",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.value, DISCOVERY_CACHE_SETTINGS_DEFAULTS);
    }
  });

  it("rejects ttl outside 1–600", () => {
    const parsed = parseDiscoveryCacheSettingsInput({
      cacheEnabled: true,
      ttlSeconds: 0,
    });
    assert.equal(parsed.ok, false);
  });

  it("rejects ttl above max", () => {
    const parsed = parseDiscoveryCacheSettingsInput({
      cacheEnabled: false,
      ttlSeconds: 601,
    });
    assert.equal(parsed.ok, false);
  });
});

describe("TtlCache", () => {
  it("returns undefined after TTL expires", () => {
    const cache = new TtlCache<{ n: number }>();
    cache.set("a", { n: 1 }, 1);
    assert.deepEqual(cache.get("a"), { n: 1 });
    cache.expireAll();
    assert.equal(cache.get("a"), undefined);
  });

  it("clones values so callers cannot mutate the store", () => {
    const cache = new TtlCache<{ n: number }>();
    cache.set("a", { n: 1 }, 60_000);
    const hit = cache.get("a");
    assert.ok(hit);
    hit.n = 99;
    assert.deepEqual(cache.get("a"), { n: 1 });
  });

  it("skips set when ttlMs is non-positive", () => {
    const cache = new TtlCache<{ n: number }>();
    cache.set("a", { n: 1 }, 0);
    assert.equal(cache.get("a"), undefined);
  });
});

describe("pickTopDishes", () => {
  it("puts active dish of the day first, then most-ordered, then newest", () => {
    const items = [
      dish({
        id: "old",
        createdAt: new Date("2023-01-01"),
      }),
      dish({
        id: "popular",
        createdAt: new Date("2023-06-01"),
      }),
      dish({
        id: "dotd",
        isDishOfTheDay: true,
        dishOfTheDayPrice: { toString: () => "40" },
        dishOfTheDayQty: 3,
        createdAt: new Date("2022-01-01"),
      }),
      dish({
        id: "newer",
        createdAt: new Date("2024-06-01"),
      }),
    ];
    const counts = new Map([
      ["popular", 12],
      ["newer", 2],
      ["old", 2],
    ]);
    const picked = pickTopDishes(items, counts, 3);
    assert.deepEqual(
      picked.map((d) => d.id),
      ["dotd", "popular", "newer"],
    );
  });

  it("does not prioritize dish of the day when qty is zero", () => {
    const items = [
      dish({
        id: "soldout",
        isDishOfTheDay: true,
        dishOfTheDayPrice: { toString: () => "40" },
        dishOfTheDayQty: 0,
        createdAt: new Date("2023-01-01"),
      }),
      dish({ id: "a", createdAt: new Date("2024-02-01") }),
      dish({ id: "b", createdAt: new Date("2024-01-01") }),
    ];
    const picked = pickTopDishes(items, new Map(), 2);
    // Sold-out DOTD is still a normal available dish, ranked by recency only.
    assert.deepEqual(
      picked.map((d) => d.id),
      ["a", "b"],
    );
  });
});
