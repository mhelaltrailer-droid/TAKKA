import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDemoPlans,
  collectDemoImageUrls,
  describeDatabaseTarget,
  demoPlanPublicCopy,
  isCatchAllRegionName,
  kitchenNameAt,
  lineHasBannedToken,
  type DemoRegionRef,
} from "./demo-data";
import { districtSortOrder } from "./district-order";
import { isFoodCategoryId } from "./food-categories";
import { OBOUR_CITY_NAME, OBOUR_DISTRICTS } from "./obour-areas";

function region(
  id: string,
  regionName: string,
  extras: Partial<DemoRegionRef> = {},
): DemoRegionRef {
  return {
    id,
    regionName,
    cityName: OBOUR_CITY_NAME,
    isActive: true,
    sortOrder: districtSortOrder(regionName),
    polygonRingJson: null,
    ...extras,
  };
}

const catalog: DemoRegionRef[] = [
  ...OBOUR_DISTRICTS.map((name, index) => region(`district-${index}`, name)),
  region("catch-all", "حي آخر"),
  region("catch-all-note", "حي آخر — غرب"),
  region("inactive-legacy", "حي الكرامة", { isActive: false, sortOrder: 1000 }),
  region("custom", "حي السلام", { sortOrder: 1500 }),
];

describe("demo catalog", () => {
  const built = buildDemoPlans(catalog);

  it("skips catch-all and inactive regions", () => {
    assert.equal(isCatchAllRegionName("حي آخر"), true);
    assert.equal(isCatchAllRegionName("حي اخر"), true);
    assert.equal(isCatchAllRegionName("حي آخر — التجمع"), true);
    assert.equal(isCatchAllRegionName("Other"), true);
    assert.equal(isCatchAllRegionName("الحي الأول"), false);
    assert.deepEqual(
      built.skipped.map((skip) => skip.regionName).sort(),
      ["حي آخر", "حي آخر — غرب", "حي الكرامة"].sort(),
    );
    assert.equal(built.plans.length, OBOUR_DISTRICTS.length + 1);
  });

  it("builds one real-looking kitchen with three approved items per district", () => {
    const names = new Set<string>();
    const phones = new Set<string>();
    const slugs = new Set<string>();
    for (const plan of built.plans) {
      names.add(plan.kitchenName);
      phones.add(plan.phoneNumber);
      slugs.add(plan.slug);
      assert.equal(plan.items.length, 3);
      assert.match(plan.phoneNumber, /^01[0-9]{9}$/);
      assert.equal(plan.slug.toLowerCase().includes("demo"), false);
      const copies = demoPlanPublicCopy(plan);
      for (const line of copies) {
        assert.equal(lineHasBannedToken(line), false, line);
      }
      assert.equal(lineHasBannedToken(plan.cityName), true);
      const itemNames = plan.items.map((item) => item.name);
      assert.equal(new Set(itemNames).size, 3);
      for (const item of plan.items) {
        assert.equal(item.approvalStatus, "APPROVED");
        assert.equal(item.isAvailable, true);
        assert.equal(isFoodCategoryId(item.categoryId), true);
        assert.match(item.imageUrl, /^https:\/\//);
        const base = Number(item.basePrice);
        const sale = item.discountedPrice == null ? null : Number(item.discountedPrice);
        assert.ok(base >= 60 && base <= 350);
        if (sale != null) {
          assert.ok(sale >= 60 && sale < base);
        }
        const payable = sale ?? base;
        assert.ok(Number(item.depositAmount) <= payable * 0.6 + 0.001);
        if (item.isDishOfTheDay) {
          const special = Number(item.dishOfTheDayPrice);
          assert.ok(special >= 60 && special < base);
        }
        for (const size of item.sizes) {
          const price = Number(size.price);
          assert.ok(price >= 60 && price <= 350);
          assert.ok(Number(size.depositAmount) <= price * 0.6 + 0.001);
        }
      }
      const urls = [plan.logoUrl, plan.coverImageUrl, ...plan.galleryUrls, ...plan.items.map((item) => item.imageUrl)];
      assert.equal(new Set(urls).size, urls.length);
    }
    assert.equal(names.size, built.plans.length);
    assert.equal(phones.size, built.plans.length);
    assert.equal(slugs.size, built.plans.length);
    assert.ok(built.plans.some((plan) => plan.items.some((item) => item.sizes.length > 0)));
    const first = built.plans.find((plan) => plan.regionName === "الحي الأول");
    assert.ok(first);
    assert.equal(first.latitude != null && first.longitude != null, true);
  });

  it("keeps the same dishes for a region when another district is added", () => {
    const again = buildDemoPlans([
      ...catalog,
      region("extra", "حي النخيل", { sortOrder: 20 }),
    ]);
    for (const plan of built.plans) {
      const match = again.plans.find((row) => row.regionId === plan.regionId);
      assert.ok(match);
      assert.deepEqual(
        match.items.map((item) => item.name),
        plan.items.map((item) => item.name),
      );
    }
  });

  it("is stable for the same region list", () => {
    const second = buildDemoPlans(catalog);
    assert.deepEqual(second, built);
  });

  it("does not leak the database password in the target label", () => {
    const label = describeDatabaseTarget(
      "postgresql://takka:super-secret@dpg-example.oregon-postgres.render.com:5432/takka_db?sslmode=require",
    );
    assert.equal(label.includes("super-secret"), false);
    assert.equal(label.includes("takka:"), false);
    assert.match(label, /dpg-example\.oregon-postgres\.render\.com:5432\/takka_db/);
  });

  it("has distinct generated kitchen names", () => {
    const names = new Set<string>();
    for (let index = 0; index < 70; index += 1) {
      const name = kitchenNameAt(index);
      assert.equal(names.has(name), false, name);
      names.add(name);
      assert.equal(lineHasBannedToken(name), false);
    }
  });

  it("only uses https image urls", () => {
    for (const url of collectDemoImageUrls(built.plans)) {
      assert.match(url, /^https:\/\//);
      assert.equal(url.toLowerCase().includes("demo"), false);
    }
  });
});

describe("demo scripts stay off notification channels", () => {
  it("does not import mail, push, realtime, or clerk", () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const files = [
      "src/lib/demo-data.ts",
      "src/lib/demo-seed.ts",
      "scripts/seed-demo.ts",
      "scripts/remove-demo-data.ts",
    ];
    const banned =
      /from\s+["'](?:nodemailer|firebase-admin|pusher|@clerk\/|@\/lib\/(?:notifications|push|pusher|kitchen-join-alert))/;
    for (const file of files) {
      const source = readFileSync(path.join(root, file), "utf8");
      assert.equal(banned.test(source), false, file);
    }
  });
});
