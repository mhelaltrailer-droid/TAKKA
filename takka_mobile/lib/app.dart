import 'package:flutter/material.dart';
import 'package:clerk_flutter/clerk_flutter.dart';

import 'core/config/app_config.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/app_role.dart';
import 'features/auth/presentation/auth_flow_screen.dart';
import 'features/auth/presentation/role_setup_screen.dart';
import 'features/home/presentation/kitchen_home_screen.dart';
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
  AppRole? _pendingRole;

  void _setPendingRole(AppRole role) {
    setState(() {
      _pendingRole = role;
    });
  }

  void _clearPendingRole() {
    setState(() {
      _pendingRole = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ClerkAuthBuilder(
      signedOutBuilder: (context, authState) {
        return AuthFlowScreen(
          selectedRole: _pendingRole,
          onRoleSelected: _setPendingRole,
        );
      },
      signedInBuilder: (context, authState) {
        final user = authState.client.user;
        final publicRole = user?.publicMetadata?['role']?.toString();
        final resolvedRole = AppRoleX.fromApiValue(publicRole);
        final displayName = _resolveDisplayName(authState);

        if (resolvedRole == null) {
          return RoleSetupScreen(
            initialRole: _pendingRole ?? AppRole.customer,
            onRoleSaved: (role) {
              setState(() {
                _pendingRole = role;
              });
            },
          );
        }

        if (_pendingRole != resolvedRole) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {
                _pendingRole = resolvedRole;
              });
            }
          });
        }

        if (resolvedRole == AppRole.customer) {
          return CustomerShellScreen(
            displayName: displayName,
            onSignOut: () async {
              await authState.signOut();
              _clearPendingRole();
            },
            onSwitchRole: () {
              _setPendingRole(AppRole.kitchenOwner);
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => RoleSetupScreen(
                    initialRole: AppRole.kitchenOwner,
                    onRoleSaved: (role) {
                      setState(() {
                        _pendingRole = role;
                      });
                    },
                  ),
                ),
              );
            },
          );
        }

        return KitchenHomeScreen(
          displayName: displayName,
          onSignOut: () async {
            await authState.signOut();
            _clearPendingRole();
          },
          onSwitchRole: () {
            _setPendingRole(AppRole.customer);
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => RoleSetupScreen(
                  initialRole: AppRole.customer,
                  onRoleSaved: (role) {
                    setState(() {
                      _pendingRole = role;
                    });
                  },
                ),
              ),
            );
          },
        );
      },
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
