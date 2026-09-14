import 'package:flutter/material.dart';
import 'package:clerk_flutter/clerk_flutter.dart';

import 'core/config/app_config.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/app_role.dart';
import 'features/auth/data/mobile_me_service.dart';
import 'features/auth/presentation/apply_pending_role_screen.dart';
import 'features/auth/presentation/auth_flow_screen.dart';
import 'features/auth/presentation/customer_become_kitchen_prompt.dart';
import 'features/auth/presentation/role_setup_screen.dart';
import 'features/home/presentation/kitchen_home_screen.dart';
import 'features/kitchen_management/presentation/kitchen_onboarding_screen.dart';
import 'features/orders/presentation/customer_shell_screen.dart';

class TakkaApp extends StatelessWidget {
  const TakkaApp({super.key});

  @override
  Widget build(BuildContext context) {
    if (!AppConfig.hasClerkKey) {
      return MaterialApp(
        title: 'تكة',
        debugShowCheckedModeBanner: false,
        theme: buildTakkaTheme(),
        home: const Directionality(
          textDirection: TextDirection.rtl,
          child: _MissingConfigScreen(),
        ),
      );
    }

    return ClerkAuth(
      config: ClerkAuthConfig(
        publishableKey: AppConfig.clerkPublishableKey,
        isTestMode: AppConfig.clerkPublishableKey.contains('_test_'),
      ),
      child: MaterialApp(
        title: 'تكة',
        debugShowCheckedModeBanner: false,
        theme: buildTakkaTheme(),
        home: const Directionality(
          textDirection: TextDirection.rtl,
          child: SafeArea(
            child: ClerkErrorListener(
              child: _AuthAwareHome(),
            ),
          ),
        ),
      ),
    );
  }
}

class _AuthAwareHome extends StatefulWidget {
  const _AuthAwareHome();

  @override
  State<_AuthAwareHome> createState() => _AuthAwareHomeState();
}

class _AuthAwareHomeState extends State<_AuthAwareHome> {
  final _meService = const MobileMeService();

  AppRole? _pendingRole;
  AppRole? _sessionRoleOverride;
  var _applyRoleFromLogin = false;
  /// Customer chose kitchen at login and already owns a kitchen row.
  var _applyKitchenReturnFromLogin = false;
  /// Customer chose kitchen at login and must complete onboarding.
  var _showKitchenOnboardingFromLogin = false;

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
    });
  }

  void _markRole(AppRole role) {
    setState(() {
      _pendingRole = role;
      _sessionRoleOverride = role;
      _applyRoleFromLogin = false;
      _applyKitchenReturnFromLogin = false;
      _showKitchenOnboardingFromLogin = false;
    });
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
        return AuthFlowScreen(
          selectedRole: _pendingRole,
          onRoleSelected: (role) => _setPendingRole(role, fromLogin: true),
        );
      },
      signedInBuilder: (context, authState) {
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

        final resolvedRole = _sessionRoleOverride ?? metadataRole;

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

        if (resolvedRole == null) {
          return RoleSetupScreen(
            initialRole: pendingRole ?? AppRole.customer,
            onRoleSaved: _markRole,
          );
        }

        if (resolvedRole == AppRole.customer) {
          return CustomerShellScreen(
            displayName: displayName,
            onSignOut: () async {
              await authState.signOut();
              _clearPendingRole();
            },
            onSwitchRole: () => _handleCustomerSwitchRole(context),
          );
        }

        return KitchenHomeScreen(
          displayName: displayName,
          onSignOut: () async {
            await authState.signOut();
            _clearPendingRole();
          },
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
        );
      },
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
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
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
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
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
