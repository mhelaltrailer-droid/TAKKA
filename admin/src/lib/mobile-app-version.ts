/**
 * Public mobile update metadata. Configured only through environment variables
 * so Render can change it without a database migration.
 *
 * MOBILE_APP_LATEST_VERSION   optional display version, x.y.z
 * MOBILE_APP_LATEST_BUILD     required integer build (pubspec +build / versionCode)
 * MOBILE_APP_MIN_BUILD        optional integer; clients below this are forced
 * MOBILE_APP_DOWNLOAD_URL     required https URL of the APK
 * MOBILE_APP_RELEASE_NOTES_AR optional Arabic notes shown in the update dialog
 */

export type MobileAppVersionPayload =
  | {
      configured: false;
      reason: string;
    }
  | {
      configured: true;
      latestVersion: string;
      latestBuild: number;
      minBuild: number;
      downloadUrl: string;
      releaseNotesAr: string;
    };

const VERSION_RE = /^\d+\.\d+\.\d+$/;
const INTEGER_RE = /^\d+$/;

function read(env: Record<string, string | undefined>, name: string): string {
  return (env[name] ?? "").trim();
}

export function resolveMobileAppVersion(
  env: Record<string, string | undefined>,
): MobileAppVersionPayload {
  const latestVersion = read(env, "MOBILE_APP_LATEST_VERSION");
  const latestBuildRaw = read(env, "MOBILE_APP_LATEST_BUILD");
  const minBuildRaw = read(env, "MOBILE_APP_MIN_BUILD");
  const downloadUrl = read(env, "MOBILE_APP_DOWNLOAD_URL");
  const releaseNotesAr = read(env, "MOBILE_APP_RELEASE_NOTES_AR");

  const anySet = [
    latestVersion,
    latestBuildRaw,
    minBuildRaw,
    downloadUrl,
    releaseNotesAr,
  ].some((value) => value.length > 0);

  if (!anySet) {
    return {
      configured: false,
      reason: "Mobile app update env vars are not set.",
    };
  }

  if (!INTEGER_RE.test(latestBuildRaw)) {
    return {
      configured: false,
      reason: "MOBILE_APP_LATEST_BUILD must be a positive integer.",
    };
  }

  const latestBuild = Number(latestBuildRaw);
  if (!Number.isSafeInteger(latestBuild) || latestBuild <= 0) {
    return {
      configured: false,
      reason: "MOBILE_APP_LATEST_BUILD must be a positive integer.",
    };
  }

  const minBuild = minBuildRaw === "" ? 0 : Number(minBuildRaw);
  if (
    minBuildRaw !== "" &&
    (!INTEGER_RE.test(minBuildRaw) ||
      !Number.isSafeInteger(minBuild) ||
      minBuild < 0)
  ) {
    return {
      configured: false,
      reason: "MOBILE_APP_MIN_BUILD must be a non-negative integer.",
    };
  }

  if (minBuild > latestBuild) {
    return {
      configured: false,
      reason: "MOBILE_APP_MIN_BUILD cannot be greater than MOBILE_APP_LATEST_BUILD.",
    };
  }

  if (!downloadUrl.startsWith("https://")) {
    return {
      configured: false,
      reason: "MOBILE_APP_DOWNLOAD_URL must be an https URL.",
    };
  }

  if (latestVersion !== "" && !VERSION_RE.test(latestVersion)) {
    return {
      configured: false,
      reason: "MOBILE_APP_LATEST_VERSION must look like 1.2.3.",
    };
  }

  return {
    configured: true,
    latestVersion: latestVersion || String(latestBuild),
    latestBuild,
    minBuild,
    downloadUrl,
    releaseNotesAr,
  };
}
