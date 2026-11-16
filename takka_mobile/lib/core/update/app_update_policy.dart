enum AppUpdateKind { none, optional, required }

const Duration appUpdateResumeThrottle = Duration(hours: 6);
const Duration appUpdateOptionalSnooze = Duration(hours: 24);

AppUpdateKind decideAppUpdate({
  required int currentBuild,
  required int latestBuild,
  required int minBuild,
}) {
  if (currentBuild <= 0 || latestBuild <= 0) {
    return AppUpdateKind.none;
  }
  if (minBuild > 0 && currentBuild < minBuild) {
    return AppUpdateKind.required;
  }
  if (currentBuild < latestBuild) {
    return AppUpdateKind.optional;
  }
  return AppUpdateKind.none;
}

/// Launch always checks. Resume checks are skipped until [appUpdateResumeThrottle]
/// has passed since the last successful response.
bool shouldFetchAppUpdate({
  required bool launch,
  required DateTime? lastCheck,
  required DateTime now,
}) {
  if (launch) {
    return true;
  }
  if (lastCheck == null) {
    return true;
  }
  return now.difference(lastCheck) >= appUpdateResumeThrottle;
}

bool shouldShowAppUpdatePrompt({
  required AppUpdateKind kind,
  required int latestBuild,
  required int? snoozedBuild,
  required DateTime? snoozedUntil,
  required DateTime now,
}) {
  if (kind == AppUpdateKind.none) {
    return false;
  }
  if (kind == AppUpdateKind.required) {
    return true;
  }
  if (snoozedBuild == latestBuild &&
      snoozedUntil != null &&
      now.isBefore(snoozedUntil)) {
    return false;
  }
  return true;
}
