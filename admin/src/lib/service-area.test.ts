import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OBOUR_CITY_RING } from "./obour-geofence";
import {
  SERVICE_AREA_DEFAULTS,
  distanceKm,
  isInsideServiceArea,
  parseServiceAreaInput,
} from "./service-area";

describe("service area", () => {
  it("covers the Obour city outline from the seeded center", () => {
    for (const [longitude, latitude] of OBOUR_CITY_RING) {
      assert.equal(
        isInsideServiceArea(latitude, longitude, SERVICE_AREA_DEFAULTS),
        true,
        `${latitude},${longitude} is ${distanceKm(
          latitude,
          longitude,
          SERVICE_AREA_DEFAULTS.centerLatitude,
          SERVICE_AREA_DEFAULTS.centerLongitude,
        ).toFixed(2)} km out`,
      );
    }
  });

  it("rejects a point in central Cairo", () => {
    assert.equal(
      isInsideServiceArea(30.0444, 31.2357, SERVICE_AREA_DEFAULTS),
      false,
    );
  });

  it("parses an admin edit and rejects an empty out-of-area message", () => {
    const parsed = parseServiceAreaInput({
      ...SERVICE_AREA_DEFAULTS,
      radiusKm: "12.5",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.radiusKm, 12.5);
    }

    const rejected = parseServiceAreaInput({
      ...SERVICE_AREA_DEFAULTS,
      outOfAreaMessage: "قصير",
    });
    assert.equal(rejected.ok, false);
  });
});
