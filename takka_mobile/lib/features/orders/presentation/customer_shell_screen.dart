import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../account/presentation/customer_account_screen.dart';
import '../../home/presentation/customer_home_screen.dart';
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
          const MyOrdersScreen(embeddedInShell: true),
          CustomerAccountScreen(
            fallbackName: widget.displayName,
            onSignOut: widget.onSignOut,
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
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
            icon: Icon(Icons.shopping_bag_outlined),
            selectedIcon: Icon(
              Icons.shopping_bag_rounded,
              color: TakkaColors.primary,
            ),
            label: 'طلباتي',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded, color: TakkaColors.primary),
            label: 'حسابي',
          ),
        ],
      ),
    );
  }
}
