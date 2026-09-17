import 'package:flutter/material.dart';

import '../../home/presentation/customer_home_screen.dart';

/// Browse-only shell for guests (no Clerk session).
class GuestBrowseShell extends StatelessWidget {
  const GuestBrowseShell({
    super.key,
    required this.onExitGuest,
  });

  final VoidCallback onExitGuest;

  @override
  Widget build(BuildContext context) {
    return CustomerHomeScreen(
      displayName: 'زائر',
      isGuest: true,
      onSignOut: onExitGuest,
      onSwitchRole: () {},
      embeddedInShell: false,
    );
  }
}
