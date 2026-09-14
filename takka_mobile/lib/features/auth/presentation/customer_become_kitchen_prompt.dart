import 'package:flutter/material.dart';

import '../data/role_switch_copy.dart';

/// Shown when a customer account tries to open the kitchen path without a kitchen.
class CustomerBecomeKitchenPrompt extends StatelessWidget {
  const CustomerBecomeKitchenPrompt({
    super.key,
    required this.onBecomeKitchen,
    this.onStayCustomer,
    this.showStayCustomer = true,
  });

  final VoidCallback onBecomeKitchen;
  final VoidCallback? onStayCustomer;
  final bool showStayCustomer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text(RoleSwitchCopy.title),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Icon(
            Icons.storefront_outlined,
            size: 56,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(height: 20),
          Text(
            RoleSwitchCopy.title,
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            RoleSwitchCopy.body,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyLarge?.copyWith(
              height: 1.65,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 28),
          FilledButton.icon(
            onPressed: onBecomeKitchen,
            icon: const Icon(Icons.add_business_outlined),
            label: const Text(RoleSwitchCopy.becomeKitchenCta),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
          if (showStayCustomer && onStayCustomer != null) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: onStayCustomer,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('البقاء كعميل'),
            ),
          ],
        ],
      ),
    );
  }
}
