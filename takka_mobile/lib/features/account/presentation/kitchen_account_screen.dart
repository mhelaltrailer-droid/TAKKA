import 'package:flutter/material.dart';

import '../../../core/auth/session_token.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/ui/takka_error_retry.dart';
import '../../../core/ui/takka_skeletons.dart';
import '../../home/data/customer_discovery_service.dart';
import 'delete_account_confirm_dialog.dart';

class KitchenAccountScreen extends StatefulWidget {
  const KitchenAccountScreen({
    super.key,
    required this.fallbackName,
    required this.onSignOut,
  });

  final String fallbackName;
  final VoidCallback onSignOut;

  @override
  State<KitchenAccountScreen> createState() => _KitchenAccountScreenState();
}

class _KitchenAccountScreenState extends State<KitchenAccountScreen> {
  final _service = const CustomerDiscoveryService();
  Future<_KitchenAccountProfile>? _profileFuture;

  @override
  void initState() {
    super.initState();
    _profileFuture = _loadProfile();
  }

  Future<_KitchenAccountProfile> _loadProfile() async {
    final jwt = await requireSessionJwt(context);
    final user = await _service.loadMe(sessionToken: jwt);
    return _KitchenAccountProfile(
      fullName: user.fullName.trim().isEmpty
          ? widget.fallbackName
          : user.fullName,
      phoneNumber: user.phoneNumber,
    );
  }

  void _retry() {
    setState(() {
      _profileFuture = _loadProfile();
    });
  }

  String _formatPhone(String? phone) {
    final raw = (phone ?? '').trim();
    if (raw.isEmpty) {
      return 'لا يوجد رقم مسجّل';
    }
    if (raw.startsWith('+')) {
      return raw;
    }
    if (raw.startsWith('01') && raw.length == 11) {
      return '+20 ${raw.substring(1)}';
    }
    return raw;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('حسابي'),
      ),
      body: SafeArea(
        child: FutureBuilder<_KitchenAccountProfile>(
          future: _profileFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const AccountScreenSkeleton();
            }

            if (snapshot.hasError) {
              return ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
                children: [
                  TakkaErrorRetry(onRetry: _retry),
                  const SizedBox(height: 16),
                  _row(
                    icon: Icons.logout_rounded,
                    title: 'تسجيل الخروج',
                    onTap: widget.onSignOut,
                  ),
                  _row(
                    icon: Icons.delete_forever_rounded,
                    title: 'حذف حسابي',
                    onTap: () {
                      runDeleteAccountFlow(
                        context,
                        onDeleted: widget.onSignOut,
                      );
                    },
                  ),
                ],
              );
            }

            final profile = snapshot.data!;
            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: TakkaColors.primary,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile.fullName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _formatPhone(profile.phoneNumber),
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.92),
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'حساب مطبخ',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                const Text(
                  'الحساب',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                _row(
                  icon: Icons.logout_rounded,
                  title: 'تسجيل الخروج',
                  onTap: widget.onSignOut,
                ),
                _row(
                  icon: Icons.delete_forever_rounded,
                  title: 'حذف حسابي',
                  onTap: () {
                    runDeleteAccountFlow(
                      context,
                      onDeleted: widget.onSignOut,
                    );
                  },
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _row({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFEBEE),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: const Color(0xFFC62828)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: Color(0xFFC62828),
                    ),
                  ),
                ),
                const Icon(
                  Icons.chevron_left_rounded,
                  color: TakkaColors.muted,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _KitchenAccountProfile {
  const _KitchenAccountProfile({
    required this.fullName,
    required this.phoneNumber,
  });

  final String fullName;
  final String? phoneNumber;
}
