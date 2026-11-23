import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_DISPLAY_SETTINGS_DEFAULTS,
  IMAGE_MAX_LONG_EDGE,
  aspectRatioForPurpose,
  centerCropRect,
  fitInsideMaxEdge,
  isCroppableUploadPurpose,
  isFoodEnhancePurpose,
  parseImageDisplaySettingsInput,
} from "./image-settings";

describe("image-settings ratios", () => {
  it("documents menu 4:3, cover 16:9, logo 1:1", () => {
    assert.equal(IMAGE_ASPECT_RATIOS.menuItemImage, 4 / 3);
    assert.equal(IMAGE_ASPECT_RATIOS.kitchenCover, 16 / 9);
    assert.equal(IMAGE_ASPECT_RATIOS.kitchenLogo, 1);
    assert.equal(aspectRatioForPurpose("menuItemImage"), 4 / 3);
    assert.equal(aspectRatioForPurpose("kitchenDocument"), null);
    assert.equal(isCroppableUploadPurpose("kitchenCover"), true);
    assert.equal(isCroppableUploadPurpose("depositProofImage"), false);
  });

  it("enhances only food cover + menu item", () => {
    assert.equal(isFoodEnhancePurpose("menuItemImage"), true);
    assert.equal(isFoodEnhancePurpose("kitchenCover"), true);
    assert.equal(isFoodEnhancePurpose("kitchenLogo"), false);
    assert.equal(isFoodEnhancePurpose("kitchenDocument"), false);
  });
});

describe("centerCropRect", () => {
  it("crops a wide image to 4:3", () => {
    const rect = centerCropRect(1600, 900, 4 / 3);
    assert.equal(rect.height, 900);
    assert.equal(rect.width, 1200);
    assert.equal(rect.x, 200);
    assert.equal(rect.y, 0);
  });

  it("crops a tall image to 16:9", () => {
    const rect = centerCropRect(900, 1600, 16 / 9);
    assert.equal(rect.width, 900);
    assert.equal(rect.height, 506);
    assert.equal(rect.x, 0);
    assert.ok(rect.y > 0);
  });
});

describe("fitInsideMaxEdge", () => {
  it("shrinks long edge to 1280 without enlarging", () => {
    assert.deepEqual(fitInsideMaxEdge(2560, 1440), {
      width: 1280,
      height: 720,
    });
    assert.deepEqual(fitInsideMaxEdge(800, 600, IMAGE_MAX_LONG_EDGE), {
      width: 800,
      height: 600,
    });
  });
});

describe("parseImageDisplaySettingsInput", () => {
  it("accepts checkbox-style booleans and position", () => {
    const parsed = parseImageDisplaySettingsInput({
      watermarkEnabled: "on",
      enhancementEnabled: false,
      watermarkPosition: "topRight",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.watermarkEnabled, true);
      assert.equal(parsed.value.enhancementEnabled, false);
      assert.equal(parsed.value.watermarkPosition, "topRight");
    }
  });

  it("rejects bad position", () => {
    const parsed = parseImageDisplaySettingsInput({
      watermarkEnabled: true,
      enhancementEnabled: true,
      watermarkPosition: "center",
    });
    assert.equal(parsed.ok, false);
  });

  it("defaults match product defaults", () => {
    assert.equal(IMAGE_DISPLAY_SETTINGS_DEFAULTS.watermarkEnabled, true);
    assert.equal(IMAGE_DISPLAY_SETTINGS_DEFAULTS.enhancementEnabled, true);
    assert.equal(
      IMAGE_DISPLAY_SETTINGS_DEFAULTS.watermarkPosition,
      "bottomLeft",
    );
  });
});
