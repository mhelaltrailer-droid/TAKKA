import 'app_role.dart';

/// Where a restored signed-in session should land.
enum RestoredHome { customer, kitchen, splash, retry, roleSetup }

/// Pick a home without waiting on the network when a role is already known.
///
/// [sessionOverride] is a role the user just saved in this process.
/// [serverRole] is the latest `/api/mobile/me` value. When [serverSettled]
/// is true and [serverFailed] is false, the server wins — including a null
/// role, which means the account still needs role setup.
/// Until that call finishes, [cachedRole] then Clerk [metadataRole] route
/// immediately. If neither exists yet, stay on [RestoredHome.splash].
/// If the call fails and nothing is cached, [RestoredHome.retry] keeps the
/// session and asks the user to try again.
RestoredHome resolveRestoredHome({
  required AppRole? sessionOverride,
  required AppRole? serverRole,
  required bool serverSettled,
  required bool serverFailed,
  required AppRole? cachedRole,
  required AppRole? metadataRole,
  required bool cacheLoaded,
}) {
  if (sessionOverride != null) {
    return _homeFor(sessionOverride);
  }
  if (serverSettled && !serverFailed) {
    if (serverRole == null) return RestoredHome.roleSetup;
    return _homeFor(serverRole);
  }
  final known = cachedRole ?? metadataRole;
  if (known != null) return _homeFor(known);
  if (!cacheLoaded || !serverSettled) return RestoredHome.splash;
  return RestoredHome.retry;
}

RestoredHome _homeFor(AppRole role) {
  return role == AppRole.customer
      ? RestoredHome.customer
      : RestoredHome.kitchen;
}
