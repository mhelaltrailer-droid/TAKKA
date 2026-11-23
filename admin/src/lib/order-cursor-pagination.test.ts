import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_ORDER_PAGE_LIMIT,
  LEGACY_ORDER_LIST_CAP,
  MAX_ORDER_PAGE_LIMIT,
  buildOrderCursorArgs,
  mergeActiveAndHistory,
  parseOrderPageParams,
  toCursorPage,
} from "./order-cursor-pagination";

describe("parseOrderPageParams", () => {
  it("uses the legacy safety cap when cursor and limit are omitted", () => {
    const parsed = parseOrderPageParams(new URLSearchParams());
    assert.equal(parsed.explicit, false);
    assert.equal(parsed.cursor, undefined);
    assert.equal(parsed.limit, LEGACY_ORDER_LIST_CAP);
  });

  it("defaults limit to 20 when pagination is explicit", () => {
    const parsed = parseOrderPageParams(new URLSearchParams("cursor=abc"));
    assert.equal(parsed.explicit, true);
    assert.equal(parsed.cursor, "abc");
    assert.equal(parsed.limit, DEFAULT_ORDER_PAGE_LIMIT);
  });

  it("clamps limit to the max of 50", () => {
    const parsed = parseOrderPageParams(new URLSearchParams("limit=999"));
    assert.equal(parsed.explicit, true);
    assert.equal(parsed.limit, MAX_ORDER_PAGE_LIMIT);
  });

  it("ignores non-positive limit values and keeps the default", () => {
    const parsed = parseOrderPageParams(new URLSearchParams("limit=0"));
    assert.equal(parsed.limit, DEFAULT_ORDER_PAGE_LIMIT);
  });
});

describe("buildOrderCursorArgs", () => {
  it("requests take limit+1 without cursor on the first page", () => {
    assert.deepEqual(buildOrderCursorArgs(undefined, 20), {
      take: 21,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  });

  it("adds Prisma cursor + skip:1 when a cursor is present", () => {
    assert.deepEqual(buildOrderCursorArgs("ord_1", 20), {
      take: 21,
      cursor: { id: "ord_1" },
      skip: 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  });
});

describe("toCursorPage", () => {
  it("sets hasMore and nextCursor when an extra row was fetched", () => {
    const rows = [
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ];
    assert.deepEqual(toCursorPage(rows, 2), {
      orders: [{ id: "a" }, { id: "b" }],
      nextCursor: "b",
      hasMore: true,
    });
  });

  it("clears nextCursor when the page is not full", () => {
    assert.deepEqual(toCursorPage([{ id: "a" }], 20), {
      orders: [{ id: "a" }],
      nextCursor: null,
      hasMore: false,
    });
  });
});

describe("mergeActiveAndHistory", () => {
  it("puts active first, then history, without duplicates", () => {
    const page = mergeActiveAndHistory(
      [{ id: "live" }, { id: "overlap" }],
      {
        orders: [{ id: "overlap" }, { id: "done" }],
        nextCursor: "done",
        hasMore: true,
      },
    );
    assert.deepEqual(page, {
      orders: [{ id: "live" }, { id: "overlap" }, { id: "done" }],
      nextCursor: "done",
      hasMore: true,
    });
  });
});
