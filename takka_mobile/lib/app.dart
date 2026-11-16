import 'dart:async';

import 'package:clerk_auth/clerk_auth.dart';
import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import 'core/auth/durable_clerk_persistor.dart';
import 'core/config/app_config.dart';
import 'core/update/app_update_host.dart';
import 'core/ui/friendly_error.dart';
import 'features/auth/data/app_role.dart';
import 'features/auth/data/app_role_cache.dart';
import 'features/auth/data/mobile_me_service.dart';
import 'features/auth/data/restored_home.dart';
import 'features/auth/presentation/apply_pending_role_screen.dart';
import 'features/auth/presentation/auth_flow_screen.dart';
import 'features/auth/presentation/customer_become_kitchen_prompt.dart';
import 'features/auth/presentation/guest_browse_shell.dart';
import 'features/auth/presentation/role_setup_screen.dart';
import 'features/auth/presentation/session_restore_views.dart';
import 'core/ui/takka_skeletons.dart';
import 'core/push/push_notification_service.dart';
import 'features/home/presentation/kitchen_home_screen.dart';
import 'features/kitchen_management/presentation/kitchen_onboarding_screen.dart';
import 'features/orders/presentation/customer_shell_screen.dart';

class TakkaApp extends StatelessWidget {
  const TakkaApp({super.key, this.persistor});

  /// Durable Clerk persistor. [main] opens one before [runApp].
  /// When null and a Clerk key is present, [_ClerkRoot] opens it itself.
  final Persistor? persistor;

  @override
  Widget build(BuildContext context) {
    if (!AppConfig.hasClerkKey) {
      return const AppUpdateHost(
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: _MissingConfigScreen(),
        ),
      );
    }

    return _ClerkRoot(persistor: persistor);
  }
}

class _ClerkRoot extends StatefulWidget {
  const _ClerkRoot({this.persistor});

  final Persistor? persistor;

  @override
  State<_ClerkRoot> createState() => _ClerkRootState();
}

class _ClerkRootState extends State<_ClerkRoot> with WidgetsBindingObserver {
  Persistor? _persistor;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final provided = widget.persistor;
    if (provided != null) {
      _persistor = provided;
    } else {
      unawaited(_openPersistor());
    }
  }

  Future<void> _openPersistor() async {
    try {
      final persistor = await DurableClerkPersistor.open();
      if (!mounted) return;
      setState(() => _persistor = persistor);
    } on Object {
      if (!mounted) return;
      setState(() => _persistor = null);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final persistor = _persistor;
    if (persistor is DurableClerkPersistor) {
      unawaited(persistor.flush());
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      final persistor = _persistor;
      if (persistor is DurableClerkPersistor) {
        unawaited(persistor.flush());
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final persistor = _persistor;
    if (persistor == null) {
      return const SessionRestoreSplash();
    }

    return ClerkAuth(
      config: ClerkAuthConfig(
        publishableKey: AppConfig.clerkPublishableKey,
        isTestMode: AppConfig.clerkPublishableKey.contains('_test_'),
        persistor: persistor,
        loading: const SessionRestoreSplash(),
      ),
      child: const AppUpdateHost(
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: SafeArea(
            child: ClerkErrorListener(
              handler: _handleClerkError,
              child: _AuthAwareHome(),
            ),
          ),
        ),
      ),
    );
  }
}

Future<void> _handleClerkError(BuildContext context, Object error) async {
  if (!context.mounted) {
    return;
  }
  showFriendlyError(
    context,
    error: error,
    onRetry: () {
      try {
        final auth = ClerkAuth.of(context, listen: false);
        auth.sessionToken().then((_) {}, onError: (_) {});
      } catch (_) {
        // Ignore — user can retry again.
      }
    },
  );
}

class _AuthAwareHome extends StatefulWidget {
  const _AuthAwareHome();

  @override
  State<_AuthAwareHome> createState() => _AuthAwareHomeState();
}

class _AuthAwareHomeState extends State<_AuthAwareHome> {
  final _meService = const MobileMeService();
  final _roleCache = AppRoleCache();

  AppRole? _pendingRole;
  AppRole? _sessionRoleOverride;
  AppRole? _cachedRole;
  AppRole? _serverRole;
  var _cacheLoaded = false;
  var _serverSettled = false;
  var _serverFailed = false;
  var _roleRefreshStarted = false;
  var _roleRefreshInFlight = false;
  var _applyRoleFromLogin = false;

  /// Customer chose kitchen at login and already owns a kitchen row.
  var _applyKitchenReturnFromLogin = false;

  /// Customer chose kitchen at login and must complete onboarding.
  var _showKitchenOnboardingFromLogin = false;
  var _guestBrowse = false;

  @override
  void initState() {
    super.initState();
    unawaited(_loadCachedRole());
  }

  Future<void> _loadCachedRole() async {
    String? userId;
    try {
      userId = ClerkAuth.of(context, listen: false).user?.id;
    } catch (_) {}
    final role = await _roleCache.read(userId: userId);
    if (!mounted) return;
    setState(() {
      _cachedRole = role;
      _cacheLoaded = true;
    });
  }

  void _setPendingRole(AppRole role, {bool fromLogin = false}) {
    setState(() {
      _pendingRole = role;
      if (fromLogin) {
        _applyRoleFromLogin = true;
      }
    });
  }

  void _clearPendingRole() {
    setState(() {
      _pendingRole = null;
      _sessionRoleOverride = null;
      _applyRoleFromLogin = false;
      _applyKitchenReturnFromLogin = false;
      _showKitchenOnboardingFromLogin = false;
      _serverRole = null;
      _serverSettled = false;
      _serverFailed = false;
      _cachedRole = null;
      _roleRefreshStarted = false;
    });
  }

  void _markRole(AppRole role) {
    setState(() {
      _pendingRole = role;
      _sessionRoleOverride = role;
      _cachedRole = role;
      _applyRoleFromLogin = false;
      _applyKitchenReturnFromLogin = false;
      _showKitchenOnboardingFromLogin = false;
    });
    unawaited(_rememberRole(role));
  }

  String? _currentUserId() {
    try {
      return ClerkAuth.of(context, listen: false).user?.id;
    } catch (_) {
      return null;
    }
  }

  Future<void> _rememberRole(AppRole role) async {
    final userId = _currentUserId();
    if (userId == null || userId.isEmpty) return;
    await _roleCache.write(userId: userId, role: role);
  }

  void _scheduleRoleRefresh(ClerkAuthState authState) {
    if (_roleRefreshStarted) return;
    _roleRefreshStarted = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      unawaited(_refreshRoleFromServer(authState));
    });
  }

  Future<void> _retryRoleRefresh() async {
    final authState = ClerkAuth.of(context, listen: false);
    setState(() {
      _serverSettled = false;
      _serverFailed = false;
    });
    await _refreshRoleFromServer(authState);
  }

  Future<void> _refreshRoleFromServer(ClerkAuthState authState) async {
    if (_roleRefreshInFlight) return;
    _roleRefreshInFlight = true;
    try {
      final userId = authState.user?.id;
      if (userId != null && _cachedRole == null) {
        final metadata = AppRoleX.fromApiValue(
          authState.client.user?.publicMetadata?['role']?.toString(),
        );
        if (metadata != null) {
          await _roleCache.write(userId: userId, role: metadata);
          if (mounted) {
            setState(() => _cachedRole = metadata);
          }
        }
      }

      final token = await authState.sessionToken().timeout(
        const Duration(seconds: 8),
      );
      final profile = await _meService
          .loadProfile(sessionToken: token.jwt)
          .timeout(const Duration(seconds: 12));
      final role = AppRoleX.fromApiValue(profile.role);
      if (userId != null && role != null) {
        await _roleCache.write(userId: userId, role: role);
      } else if (role == null) {
        await _roleCache.clear();
      }
      if (!mounted) return;
      setState(() {
        _serverRole = role;
        _serverSettled = true;
        _serverFailed = false;
        _cachedRole = role;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _serverSettled = true;
        _serverFailed = true;
      });
    } finally {
      _roleRefreshInFlight = false;
    }
  }

  Future<void> _signOut(BuildContext context, ClerkAuthState authState) async {
    try {
      final token = await authState.sessionToken();
      await PushNotificationService.instance.unregister(
        sessionToken: token.jwt,
      );
    } catch (_) {}
    await _roleCache.clear();
    await authState.signOut();
    _clearPendingRole();
  }

  Future<void> _handleCustomerSwitchRole(BuildContext context) async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final profile = await _meService.loadProfile(sessionToken: token.jwt);

      if (!context.mounted) {
        return;
      }

      if (profile.hasKitchen) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ApplyPendingRoleScreen(
              role: AppRole.kitchenOwner,
              onApplied: _markRole,
            ),
          ),
        );
        return;
      }

      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => CustomerBecomeKitchenPrompt(
            onBecomeKitchen: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute<void>(
                  builder: (_) => KitchenOnboardingScreen(
                    onCompleted: () => _markRole(AppRole.kitchenOwner),
                  ),
                ),
              );
            },
            onStayCustomer: () => Navigator.of(context).pop(),
          ),
        ),
      );
    } catch (_) {
      if (!context.mounted) {
        return;
      }
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => KitchenOnboardingScreen(
            onCompleted: () => _markRole(AppRole.kitchenOwner),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ClerkAuthBuilder(
      signedOutBuilder: (context, authState) {
        if (_guestBrowse) {
          return GuestBrowseShell(
            onExitGuest: () => setState(() => _guestBrowse = false),
          );
        }
        return AuthFlowScreen(
          selectedRole: _pendingRole,
          onRoleSelected: (role) => _setPendingRole(role, fromLogin: true),
          onGuestBrowse: () => setState(() => _guestBrowse = true),
        );
      },
      signedInBuilder: (context, authState) {
        if (_guestBrowse) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && _guestBrowse) {
              setState(() => _guestBrowse = false);
            }
          });
        }
        final user = authState.client.user;
        final publicRole = user?.publicMetadata?['role']?.toString();
        final metadataRole = AppRoleX.fromApiValue(publicRole);
        final displayName = _resolveDisplayName(authState);
        final pendingRole = _pendingRole;

        if (_sessionRoleOverride != null &&
            metadataRole == _sessionRoleOverride) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && _sessionRoleOverride != null) {
              setState(() => _sessionRoleOverride = null);
            }
          });
        }

        _scheduleRoleRefresh(authState);
        final resolvedRole =
            _sessionRoleOverride ?? _serverRole ?? _cachedRole ?? metadataRole;

        if (_showKitchenOnboardingFromLogin) {
          return KitchenOnboardingScreen(
            embeddedAsRoot: true,
            onCompleted: () => _markRole(AppRole.kitchenOwner),
          );
        }

        if (_applyKitchenReturnFromLogin) {
          return ApplyPendingRoleScreen(
            role: AppRole.kitchenOwner,
            onApplied: _markRole,
          );
        }

        // Login as kitchen while account is customer.
        if (_applyRoleFromLogin &&
            pendingRole == AppRole.kitchenOwner &&
            resolvedRole == AppRole.customer &&
            _sessionRoleOverride == null) {
          return _LoginKitchenGate(
            meService: _meService,
            onHasKitchen: () {
              setState(() {
                _applyRoleFromLogin = false;
                _applyKitchenReturnFromLogin = true;
              });
            },
            onBecomeKitchen: () {
              setState(() {
                _applyRoleFromLogin = false;
                _showKitchenOnboardingFromLogin = true;
              });
            },
            onStayCustomer: () {
              setState(() {
                _applyRoleFromLogin = false;
                _pendingRole = AppRole.customer;
              });
            },
          );
        }

        if (_applyRoleFromLogin &&
            pendingRole != null &&
            pendingRole != resolvedRole &&
            _sessionRoleOverride == null) {
          return ApplyPendingRoleScreen(
            role: pendingRole,
            onApplied: _markRole,
          );
        }

        final home = resolveRestoredHome(
          sessionOverride: _sessionRoleOverride,
          serverRole: _serverRole,
          serverSettled: _serverSettled,
          serverFailed: _serverFailed,
          cachedRole: _cachedRole,
          metadataRole: metadataRole,
          cacheLoaded: _cacheLoaded,
        );

        switch (home) {
          case RestoredHome.splash:
            return const SessionRestoreSplash();
          case RestoredHome.retry:
            return SessionRestoreRetry(
              onRetry: () {
                unawaited(_retryRoleRefresh());
              },
            );
          case RestoredHome.roleSetup:
            return RoleSetupScreen(
              initialRole: pendingRole ?? AppRole.customer,
              onRoleSaved: _markRole,
            );
          case RestoredHome.customer:
            return _withRoleBanner(
              CustomerShellScreen(
                displayName: displayName,
                onSignOut: () => _signOut(context, authState),
                onSwitchRole: () => _handleCustomerSwitchRole(context),
              ),
            );
          case RestoredHome.kitchen:
            return _withRoleBanner(
              KitchenHomeScreen(
                displayName: displayName,
                onSignOut: () => _signOut(context, authState),
                onSwitchRole: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => RoleSetupScreen(
                        initialRole: AppRole.customer,
                        onRoleSaved: _markRole,
                      ),
                    ),
                  );
                },
              ),
            );
        }
      },
    );
  }

  Widget _withRoleBanner(Widget child) {
    if (!_serverFailed) return child;
    return Column(
      children: [
        OfflineRoleBanner(
          onRetry: () {
            unawaited(_retryRoleRefresh());
          },
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _LoginKitchenGate extends StatefulWidget {
  const _LoginKitchenGate({
    required this.meService,
    required this.onHasKitchen,
    required this.onBecomeKitchen,
    required this.onStayCustomer,
  });

  final MobileMeService meService;
  final VoidCallback onHasKitchen;
  final VoidCallback onBecomeKitchen;
  final VoidCallback onStayCustomer;

  @override
  State<_LoginKitchenGate> createState() => _LoginKitchenGateState();
}

class _LoginKitchenGateState extends State<_LoginKitchenGate> {
  var _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final profile = await widget.meService.loadProfile(
        sessionToken: token.jwt,
      );
      if (!mounted) {
        return;
      }
      if (profile.hasKitchen) {
        widget.onHasKitchen();
        return;
      }
      setState(() => _loading = false);
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: CustomerHomeSkeleton());
    }

    return CustomerBecomeKitchenPrompt(
      onBecomeKitchen: widget.onBecomeKitchen,
      onStayCustomer: widget.onStayCustomer,
    );
  }
}

String _resolveDisplayName(ClerkAuthState authState) {
  final user = authState.client.user;
  final fullName = [user?.firstName, user?.lastName]
      .whereType<String>()
      .where((value) => value.trim().isNotEmpty)
      .join(' ')
      .trim();

  if (fullName.isNotEmpty) {
    return fullName;
  }

  if (user?.username case final username? when username.trim().isNotEmpty) {
    return username;
  }

  return 'مستخدم تكة';
}

class _MissingConfigScreen extends StatelessWidget {
  const _MissingConfigScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.key_off_rounded, size: 48),
                  const SizedBox(height: 16),
                  const Text(
                    'مفتاح Clerk غير مضبوط',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'شغّل التطبيق باستخدام `--dart-define=CLERK_PUBLISHABLE_KEY=...` حتى تعمل المصادقة الحقيقية داخل تطبيق تكة.',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
