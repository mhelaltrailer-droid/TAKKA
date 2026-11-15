import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clientIpFromRequest, createMemoryRateLimiter } from "./rate-limit";

describe("createMemoryRateLimiter", () => {
  it("blocks rapid repeats for the same key and leaves other keys alone", () => {
    const limiter = createMemoryRateLimiter({ limit: 2, windowMs: 60_000 });
    const start = 1_000_000;
    assert.equal(limiter.check("1.1.1.1", start).allowed, true);
    assert.equal(limiter.check("1.1.1.1", start + 10).allowed, true);
    const blocked = limiter.check("1.1.1.1", start + 20);
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
      assert.ok(blocked.retryAfterSeconds >= 1);
    }
    assert.equal(limiter.check("2.2.2.2", start).allowed, true);
    assert.equal(limiter.check("1.1.1.1", start + 60_001).allowed, true);
  });
});

describe("clientIpFromRequest", () => {
  it("uses the first forwarded address", () => {
    const request = new Request("https://takka-app.onrender.com/api/join-kitchen", {
      headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.1" },
    });
    assert.equal(clientIpFromRequest(request), "203.0.113.8");
  });
});
