import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_theme.dart';
import '../../cart/presentation/addresses_screen.dart';
import '../../home/data/customer_discovery_service.dart';
import '../../notifications/presentation/notifications_screen.dart';

const _notificationsEnabledKey = 'takka.notificationsEnabled';

class CustomerAccountScreen extends StatefulWidget {
  const CustomerAccountScreen({
    super.key,
    required this.fallbackName,
    required this.onSignOut,
  });

  final String fallbackName;
  final VoidCallback onSignOut;

  @override
  State<CustomerAccountScreen> createState() => _CustomerAccountScreenState();
}

class _CustomerAccountScreenState extends State<CustomerAccountScreen> {
  final _service = const CustomerDiscoveryService();
  Future<_AccountProfile>? _profileFuture;
  var _notificationsEnabled = true;

  @override
  void initState() {
    super.initState();
    _profileFuture = _loadProfile();
    _loadNotificationPref();
  }

  Future<void> _loadNotificationPref() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _notificationsEnabled = prefs.getBool(_notificationsEnabledKey) ?? true;
    });
  }

  Future<void> _setNotificationsEnabled(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_notificationsEnabledKey, value);
    if (!mounted) return;
    setState(() => _notificationsEnabled = value);
  }

  Future<_AccountProfile> _loadProfile() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    final user = await _service.loadMe(sessionToken: token.jwt);
    return _AccountProfile(
      fullName: user.fullName.trim().isEmpty
          ? widget.fallbackName
          : user.fullName,
      phoneNumber: user.phoneNumber,
    );
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
      body: SafeArea(
        child: FutureBuilder<_AccountProfile>(
          future: _profileFuture,
          builder: (context, snapshot) {
            final profile = snapshot.data;
            final name = profile?.fullName ?? widget.fallbackName;
            final phone = _formatPhone(profile?.phoneNumber);
            final loading =
                snapshot.connectionState != ConnectionState.done;

            return RefreshIndicator(
              onRefresh: () async {
                final future = _loadProfile();
                setState(() => _profileFuture = future);
                await future;
              },
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
                children: [
                  const Text(
                    'حسابي',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: TakkaColors.primary,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (loading)
                                    const SizedBox(
                                      height: 22,
                                      width: 22,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  else
                                    Text(
                                      name,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 24,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  const SizedBox(height: 6),
                                  Text(
                                    phone,
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.92),
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Align(
                                    alignment: AlignmentDirectional.centerStart,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                      child: const Text(
                                        'حساب مشتري',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              width: 64,
                              height: 64,
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.person_rounded,
                                size: 34,
                                color: TakkaColors.ink,
                              ),
                            ),
                          ],
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
                  _AccountRow(
                    icon: Icons.notifications_none_rounded,
                    iconBg: const Color(0xFFE8F5E9),
                    iconColor: const Color(0xFF2E7D32),
                    title: 'الإشعارات',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const NotificationsScreen(),
                        ),
                      );
                    },
                    trailing: Switch.adaptive(
                      value: _notificationsEnabled,
                      activeThumbColor: Colors.white,
                      activeTrackColor: const Color(0xFF2E7D32),
                      onChanged: _setNotificationsEnabled,
                    ),
                  ),
                  _AccountRow(
                    icon: Icons.location_on_outlined,
                    iconBg: const Color(0xFFFFF0E8),
                    iconColor: TakkaColors.secondary,
                    title: 'عناوين التوصيل',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const AddressesScreen(),
                        ),
                      );
                    },
                  ),
                  _AccountRow(
                    icon: Icons.logout_rounded,
                    iconBg: const Color(0xFFFFEBEE),
                    iconColor: const Color(0xFFC62828),
                    title: 'تسجيل الخروج',
                    titleColor: const Color(0xFFC62828),
                    onTap: widget.onSignOut,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _AccountProfile {
  const _AccountProfile({
    required this.fullName,
    required this.phoneNumber,
  });

  final String fullName;
  final String? phoneNumber;
}

class _AccountRow extends StatelessWidget {
  const _AccountRow({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.title,
    required this.onTap,
    this.trailing,
    this.titleColor,
  });

  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final VoidCallback onTap;
  final Widget? trailing;
  final Color? titleColor;

  @override
  Widget build(BuildContext context) {
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
                    color: iconBg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: iconColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: titleColor ?? TakkaColors.ink,
                    ),
                  ),
                ),
                if (trailing != null)
                  trailing!
                else
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
