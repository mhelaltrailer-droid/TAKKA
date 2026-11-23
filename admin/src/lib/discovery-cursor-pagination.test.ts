import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_DISCOVERY_PAGE_LIMIT,
  MAX_DISCOVERY_PAGE_LIMIT,
  buildDiscoveryCursorArgs,
  parseDiscoveryPageParams,
  toDiscoveryCursorPage,
} from "./discovery-cursor-pagination";

describe("parseDiscoveryPageParams", () => {
  it("defaults limit to 20", () => {
    const parsed = parseDiscoveryPageParams(new URLSearchParams());
    assert.equal(parsed.cursor, undefined);
    assert.equal(parsed.limit, DEFAULT_DISCOVERY_PAGE_LIMIT);
  });

  it("reads cursor and clamps limit to 50", () => {
    const parsed = parseDiscoveryPageParams(
      new URLSearchParams("cursor=k1&limit=999"),
    );
    assert.equal(parsed.cursor, "k1");
    assert.equal(parsed.limit, MAX_DISCOVERY_PAGE_LIMIT);
  });

  it("ignores non-positive limit", () => {
    const parsed = parseDiscoveryPageParams(new URLSearchParams("limit=0"));
    assert.equal(parsed.limit, DEFAULT_DISCOVERY_PAGE_LIMIT);
  });
});

describe("buildDiscoveryCursorArgs", () => {
  it("requests take limit+1 without cursor on the first page", () => {
    assert.deepEqual(buildDiscoveryCursorArgs(undefined, 20), {
      take: 21,
      orderBy: [
        { averageRating: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });
  });

  it("adds Prisma cursor + skip:1 when a cursor is present", () => {
    assert.deepEqual(buildDiscoveryCursorArgs("kit_1", 20), {
      take: 21,
      cursor: { id: "kit_1" },
      skip: 1,
      orderBy: [
        { averageRating: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });
  });
});

describe("toDiscoveryCursorPage", () => {
  it("sets hasMore and nextCursor when an extra row was fetched", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    assert.deepEqual(toDiscoveryCursorPage(rows, 2), {
      items: [{ id: "a" }, { id: "b" }],
      nextCursor: "b",
      hasMore: true,
    });
  });

  it("clears nextCursor when the page is not full", () => {
    assert.deepEqual(toDiscoveryCursorPage([{ id: "a" }], 20), {
      items: [{ id: "a" }],
      nextCursor: null,
      hasMore: false,
    });
  });
});
