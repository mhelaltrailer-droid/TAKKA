import 'dart:async';

import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/push/push_navigation.dart';
import '../../../core/push/push_notification_service.dart';
import '../../../core/push/push_target.dart';
import '../../../core/theme/app_theme.dart';
import '../../account/presentation/customer_account_screen.dart';
import '../../home/presentation/customer_home_screen.dart';
import '../../home/presentation/deals_browse_screen.dart';
import 'my_orders_screen.dart';

class CustomerShellScreen extends StatefulWidget {
  const CustomerShellScreen({
    super.key,
    required this.displayName,
    required this.onSignOut,
    required this.onSwitchRole,
  });

  final String displayName;
  final VoidCallback onSignOut;
  final VoidCallback onSwitchRole;

  @override
  State<CustomerShellScreen> createState() => _CustomerShellScreenState();
}

class _CustomerShellScreenState extends State<CustomerShellScreen> {
  var _index = 0;

  /// Only mount a tab after the user opens it (home starts visited).
  final _visited = <int>{0};
  late final PushTargetHandler _onPushTarget;

  @override
  void initState() {
    super.initState();
    _onPushTarget = (target) {
      if (!mounted || target.audience != PushAudience.customer) {
        return false;
      }
      openPushTarget(context, target);
      return true;
    };
    PushNotificationService.instance.addListener(_onPushTarget);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_enablePush());
    });
  }

  @override
  void dispose() {
    PushNotificationService.instance.removeListener(_onPushTarget);
    super.dispose();
  }

  Future<void> _enablePush() async {
    if (!mounted) {
      return;
    }
    try {
      PushNotificationService.instance.flushPending(PushAudience.customer);
      final authState = ClerkAuth.of(context, listen: false);
      PushNotificationService.instance.bindSession(() async {
        try {
          final token = await authState.sessionToken();
          return token.jwt;
        } catch (_) {
          return null;
        }
      });
      if (!mounted) {
        return;
      }
      await PushNotificationService.instance.ensureEnabled(
        context,
        audience: PushAudience.customer,
      );
    } catch (error) {
      debugPrint('Takka customer push setup skipped: $error');
    }
  }

  void _selectTab(int value) {
    setState(() {
      _index = value;
      _visited.add(value);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          CustomerHomeScreen(
            displayName: widget.displayName,
            onSignOut: widget.onSignOut,
            onSwitchRole: widget.onSwitchRole,
            embeddedInShell: true,
          ),
          _visited.contains(1)
              ? const DealsBrowseScreen(embeddedInShell: true)
              : const SizedBox.shrink(),
          _visited.contains(2)
              ? const MyOrdersScreen(embeddedInShell: true)
              : const SizedBox.shrink(),
          _visited.contains(3)
              ? CustomerAccountScreen(
                  fallbackName: widget.displayName,
                  onSignOut: widget.onSignOut,
                )
              : const SizedBox.shrink(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _selectTab,
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFF0E8E0),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded, color: TakkaColors.primary),
            label: 'الرئيسية',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_fire_department_outlined),
            selectedIcon: Icon(
              Icons.local_fire_department_rounded,
              color: TakkaColors.primary,
            ),
            label: 'العروض',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_bag_outlined),
            selectedIcon: Icon(
              Icons.shopping_bag_rounded,
              color: TakkaColors.primary,
            ),
            label: 'طلباتي',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(
              Icons.person_rounded,
              color: TakkaColors.primary,
            ),
            label: 'حسابي',
          ),
        ],
      ),
    );
  }
}
