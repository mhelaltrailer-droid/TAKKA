import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../data/app_role.dart';
import '../data/mobile_role_service.dart';
import 'role_setup_screen.dart';

/// Applies the role chosen on the sign-in screen when it differs from Clerk metadata.
class ApplyPendingRoleScreen extends StatefulWidget {
  const ApplyPendingRoleScreen({
    super.key,
    required this.role,
    required this.onApplied,
  });

  final AppRole role;
  final ValueChanged<AppRole> onApplied;

  @override
  State<ApplyPendingRoleScreen> createState() => _ApplyPendingRoleScreenState();
}

class _ApplyPendingRoleScreenState extends State<ApplyPendingRoleScreen> {
  final _roleService = const MobileRoleService();
  String? _errorMessage;
  var _showManualSetup = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _apply());
  }

  Future<void> _apply() async {
    setState(() {
      _errorMessage = null;
      _showManualSetup = false;
    });

    try {
      final authState = ClerkAuth.of(context, listen: false);
      final sessionToken = await authState.sessionToken();
      await _roleService.saveRole(
        sessionToken: sessionToken.jwt,
        role: widget.role,
      );
      await authState.refreshClient();
      if (!mounted) {
        return;
      }
      widget.onApplied(widget.role);
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage =
            'تعذر تفعيل دور «${widget.role.label}» تلقائيًا.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_showManualSetup) {
      return RoleSetupScreen(
        initialRole: widget.role,
        onRoleSaved: widget.onApplied,
      );
    }

    final theme = Theme.of(context);

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_errorMessage == null) ...[
                const CircularProgressIndicator(),
                const SizedBox(height: 20),
                Text(
                  'جارٍ فتح حساب ${widget.role.label}...',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                  textAlign: TextAlign.center,
                ),
              ] else ...[
                Icon(
                  Icons.error_outline,
                  size: 48,
                  color: theme.colorScheme.error,
                ),
                const SizedBox(height: 16),
                Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: theme.colorScheme.error,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _apply,
                  child: const Text('إعادة المحاولة'),
                ),
                const SizedBox(height: 10),
                TextButton(
                  onPressed: () => setState(() => _showManualSetup = true),
                  child: const Text('اختيار الدور يدويًا'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
