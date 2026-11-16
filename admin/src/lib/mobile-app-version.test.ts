import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveMobileAppVersion } from "./mobile-app-version";

const valid = {
  MOBILE_APP_LATEST_VERSION: "1.2.0",
  MOBILE_APP_LATEST_BUILD: "5",
  MOBILE_APP_MIN_BUILD: "3",
  MOBILE_APP_DOWNLOAD_URL: "https://github.com/example/takka/releases/download/v1.2.0/takka.apk",
  MOBILE_APP_RELEASE_NOTES_AR: "إصلاحات للمطابخ",
};

describe("resolveMobileAppVersion", () => {
  it("stays unconfigured when no env vars are set", () => {
    const payload = resolveMobileAppVersion({});
    assert.equal(payload.configured, false);
    if (!payload.configured) {
      assert.match(payload.reason, /not set/i);
    }
  });

  it("returns the public payload when the env is complete", () => {
    assert.deepEqual(resolveMobileAppVersion(valid), {
      configured: true,
      latestVersion: "1.2.0",
      latestBuild: 5,
      minBuild: 3,
      downloadUrl: valid.MOBILE_APP_DOWNLOAD_URL,
      releaseNotesAr: "إصلاحات للمطابخ",
    });
  });

  it("defaults min build to 0 and version display to the build number", () => {
    const payload = resolveMobileAppVersion({
      MOBILE_APP_LATEST_BUILD: "2",
      MOBILE_APP_DOWNLOAD_URL: "https://takka-app.onrender.com/apk",
    });
    assert.equal(payload.configured, true);
    if (payload.configured) {
      assert.equal(payload.minBuild, 0);
      assert.equal(payload.latestVersion, "2");
      assert.equal(payload.releaseNotesAr, "");
    }
  });

  it("rejects partial or unsafe values without throwing", () => {
    const cases: Array<Record<string, string>> = [
      { MOBILE_APP_LATEST_BUILD: "0", MOBILE_APP_DOWNLOAD_URL: "https://example.com/a.apk" },
      { MOBILE_APP_LATEST_BUILD: "1.5", MOBILE_APP_DOWNLOAD_URL: "https://example.com/a.apk" },
      { MOBILE_APP_LATEST_BUILD: "2", MOBILE_APP_DOWNLOAD_URL: "http://example.com/a.apk" },
      {
        MOBILE_APP_LATEST_BUILD: "2",
        MOBILE_APP_MIN_BUILD: "9",
        MOBILE_APP_DOWNLOAD_URL: "https://example.com/a.apk",
      },
      {
        MOBILE_APP_LATEST_VERSION: "v1.0",
        MOBILE_APP_LATEST_BUILD: "2",
        MOBILE_APP_DOWNLOAD_URL: "https://example.com/a.apk",
      },
      { MOBILE_APP_RELEASE_NOTES_AR: "ملاحظات بدون رقم بناء" },
    ];

    for (const env of cases) {
      const payload = resolveMobileAppVersion(env);
      assert.equal(payload.configured, false, JSON.stringify(env));
    }
  });

  it("trims surrounding whitespace", () => {
    const payload = resolveMobileAppVersion({
      MOBILE_APP_LATEST_VERSION: " 1.0.1 ",
      MOBILE_APP_LATEST_BUILD: " 4 ",
      MOBILE_APP_MIN_BUILD: " 4 ",
      MOBILE_APP_DOWNLOAD_URL: " https://example.com/takka.apk ",
      MOBILE_APP_RELEASE_NOTES_AR: " فيه نسخة ",
    });
    assert.equal(payload.configured, true);
    if (payload.configured) {
      assert.equal(payload.latestVersion, "1.0.1");
      assert.equal(payload.latestBuild, 4);
      assert.equal(payload.releaseNotesAr, "فيه نسخة");
    }
  });
});
