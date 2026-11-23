import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApprovalStatus } from "@prisma/client";

import {
  buildDiscoveryFeedWhere,
  discoveryFeedCacheKey,
  parseDiscoveryFeedQuery,
} from "./discovery-feed";

describe("parseDiscoveryFeedQuery", () => {
  it("parses filters and pagination", () => {
    const query = parseDiscoveryFeedQuery(
      new URLSearchParams(
        "cityName=مدينة العبور&regionName=الحي الأول&category=bakery&q=كبسة&limit=10&cursor=abc",
      ),
    );
    assert.equal(query.cityName, "مدينة العبور");
    assert.equal(query.regionName, "الحي الأول");
    assert.equal(query.category, "bakery");
    assert.equal(query.q, "كبسة");
    assert.equal(query.limit, 10);
    assert.equal(query.cursor, "abc");
  });

  it("prefers regionId when provided", () => {
    const query = parseDiscoveryFeedQuery(
      new URLSearchParams("regionId=reg_1&regionName=ignored"),
    );
    assert.equal(query.regionId, "reg_1");
    assert.equal(query.regionName, "ignored");
  });
});

describe("discoveryFeedCacheKey", () => {
  it("distinguishes filters and pagination", () => {
    const a = discoveryFeedCacheKey({
      cityName: "مدينة العبور",
      limit: 20,
    });
    const b = discoveryFeedCacheKey({
      cityName: "مدينة العبور",
      regionName: "الحي الأول",
      limit: 20,
    });
    const c = discoveryFeedCacheKey({
      cityName: "مدينة العبور",
      q: "كبسة",
      limit: 20,
    });
    assert.notEqual(a, b);
    assert.notEqual(a, c);
  });
});

describe("buildDiscoveryFeedWhere", () => {
  it("requires approved kitchens in the city and listed visibility", () => {
    const where = buildDiscoveryFeedWhere({
      cityName: "مدينة العبور",
      limit: 20,
    });
    assert.equal(where.approvalStatus, ApprovalStatus.APPROVED);
    assert.equal(where.cityName, "مدينة العبور");
    assert.ok(Array.isArray(where.AND));
    assert.ok((where.AND as unknown[]).length >= 1);
  });

  it("adds regionId, category, and Arabic-friendly search filters", () => {
    const where = buildDiscoveryFeedWhere({
      cityName: "مدينة العبور",
      regionId: "reg_1",
      category: "bakery",
      q: "كبسة",
      limit: 20,
    });
    const and = where.AND as Record<string, unknown>[];
    assert.ok(and.some((f) => f.regionId === "reg_1"));
    assert.ok(
      and.some(
        (f) =>
          (f.menuItems as { some?: { categoryId?: string } } | undefined)?.some
            ?.categoryId === "bakery",
      ),
    );
    const search = and.find((f) => {
      const or = f.OR as Record<string, unknown>[] | undefined;
      return (
        Array.isArray(or) &&
        or.some(
          (clause) =>
            (clause.kitchenName as { contains?: string } | undefined)
              ?.contains === "كبسة",
        )
      );
    });
    assert.ok(search);
  });

  it("uses regionName when regionId is absent", () => {
    const where = buildDiscoveryFeedWhere({
      cityName: "مدينة العبور",
      regionName: "الحي الأول",
      limit: 20,
    });
    const and = where.AND as Record<string, unknown>[];
    assert.ok(
      and.some(
        (f) =>
          (f.region as { regionName?: string } | undefined)?.regionName ===
          "الحي الأول",
      ),
    );
  });
});
