import 'dart:async';

import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/community/takka_partners_community.dart';
import '../../../core/kitchen/kitchen_feature_gate.dart';
import '../../../core/kitchen/kitchen_onboarding_copy.dart';
import '../../../core/links/external_link.dart';
import '../../../core/push/push_navigation.dart';
import '../../../core/push/push_notification_service.dart';
import '../../../core/push/push_target.dart';
import '../../../core/realtime/kitchen_new_order_alert_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/ui/confirm_destructive.dart';
import '../../../core/ui/friendly_error.dart';
import '../../account/presentation/kitchen_account_screen.dart';
import '../../auth/data/mobile_me_service.dart';
import '../../kitchen_management/data/kitchen_management_service.dart';
import '../../kitchen_management/presentation/kitchen_menu_management_screen.dart';
import '../../kitchen_management/presentation/kitchen_onboarding_screen.dart';
import '../../kitchen_management/presentation/kitchen_stats_screen.dart';
import '../../notifications/presentation/notifications_screen.dart';
import '../../orders/presentation/kitchen_orders_screen.dart';

class KitchenHomeScreen extends StatefulWidget {
  const KitchenHomeScreen({
    super.key,
    required this.displayName,
    required this.onSignOut,
    required this.onSwitchRole,
  });

  final String displayName;
  final VoidCallback onSignOut;
  final VoidCallback onSwitchRole;

  @override
  State<KitchenHomeScreen> createState() => _KitchenHomeScreenState();
}

class _KitchenHomeScreenState extends State<KitchenHomeScreen> {
  final _service = const KitchenManagementService();
  final _meService = const MobileMeService();
  KitchenProfileData? _profile;
  bool _profileLoading = true;
  bool _availabilityBusy = false;
  bool _ackBusy = false;
  bool _suspensionPromptOpen = false;
  late final PushTargetHandler _onPushTarget;

  @override
  void initState() {
    super.initState();
    _onPushTarget = (target) {
      if (!mounted || target.audience != PushAudience.kitchen) {
        return false;
      }
      openPushTarget(context, target);
      return true;
    };
    PushNotificationService.instance.addListener(_onPushTarget);
    _refreshProfile();
    _startNewOrderAlerts();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_enablePush());
    });
  }

  @override
  void dispose() {
    PushNotificationService.instance.removeListener(_onPushTarget);
    KitchenNewOrderAlertService.instance.stop();
    super.dispose();
  }

  Future<void> _enablePush() async {
    if (!mounted) {
      return;
    }
    try {
      PushNotificationService.instance.flushPending(PushAudience.kitchen);
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
        audience: PushAudience.kitchen,
      );
    } catch (error) {
      debugPrint('Takka kitchen push setup skipped: $error');
    }
  }

  Future<void> _startNewOrderAlerts() async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final appUserId = await _meService.loadAppUserId(sessionToken: token.jwt);
      if (!mounted || appUserId.isEmpty) {
        return;
      }
      await KitchenNewOrderAlertService.instance.start(appUserId: appUserId);
    } catch (_) {}
  }

  Future<void> _refreshProfile() async {
    setState(() => _profileLoading = true);
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final profile = await _service.loadProfile(sessionToken: token.jwt);
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _profileLoading = false;
      });
      await _maybePromptSuspension();
    } catch (_) {
      if (!mounted) return;
      setState(() => _profileLoading = false);
    }
  }

  Future<void> _maybePromptSuspension() async {
    final profile = _profile;
    if (!mounted ||
        profile == null ||
        !profile.isSuspended ||
        _suspensionPromptOpen) {
      return;
    }
    _suspensionPromptOpen = true;
    final canAcknowledge = profile.canAcknowledgeSuspension;
    final reason = profile.suspensionReason?.trim().isNotEmpty == true
        ? profile.suspensionReason!
        : canAcknowledge
        ? 'تم إيقاف استقبال الطلبات. العملاء يشوفون المطبخ مشغول. اضغط «فهمت» لإعادة الاستقبال.'
        : 'تم إيقاف المطبخ. فريق تكة هيراجع الحالة، وقراءة التنبيه مش بتفك الإيقاف.';
    final acknowledged = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('استقبال الطلبات متوقف'),
          content: Text(reason),
          actions: [
            if (!canAcknowledge)
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('حسنًا'),
              )
            else ...[
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('لاحقًا'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('فهمت'),
              ),
            ],
          ],
        );
      },
    );
    _suspensionPromptOpen = false;
    if (acknowledged == true) {
      await _acknowledgeSuspension();
    }
  }

  Future<void> _acknowledgeSuspension() async {
    if (_ackBusy) return;
    setState(() => _ackBusy = true);
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _service.acknowledgeSuspension(sessionToken: token.jwt);
      if (!mounted) return;
      setState(() => _ackBusy = false);
      await _refreshProfile();
    } catch (error) {
      if (!mounted) return;
      setState(() => _ackBusy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyErrorMessage(error))),
      );
    }
  }

  String _availabilitySavedMessage(String resolved) {
    switch (resolved) {
      case 'OPEN':
        return 'المطبخ مفتوح الآن ويظهر للعملاء.';
      case 'BUSY':
        return 'المطبخ مشغول الآن. العملاء يشوفونه مشغول ولا يمكنهم الطلب لحد ما تغيّر الحالة.';
      default:
        return 'تم إغلاق المطبخ ولن يظهر للعملاء.';
    }
  }

  Future<void> _setAvailability(String nextStatus) async {
    if (_availabilityBusy || _profile == null) return;
    if (_profile!.approvalStatus != 'APPROVED') return;
    if (_profile!.availabilityStatus == nextStatus) return;

    if (nextStatus == 'BUSY') {
      final confirmed = await confirmDestructive(
        context,
        title: 'تحويل المطبخ إلى مشغول؟',
        message:
            'العملاء هيشوفوا المطبخ مشغول ومش هيقدروا يطلبوا لحد ما تغيّر الحالة بنفسك.',
        confirmLabel: 'مشغول',
      );
      if (!confirmed || !mounted) return;
    }

    if (nextStatus == 'CLOSED') {
      final confirmed = await confirmDestructive(
        context,
        title: 'إغلاق استقبال الطلبات؟',
        message: 'عند الإغلاق لن يظهر مطبخك للعملاء ولن يستقبل طلبات جديدة.',
        confirmLabel: 'إغلاق',
      );
      if (!confirmed || !mounted) return;
    }

    setState(() => _availabilityBusy = true);
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final resolved = await _service.updateKitchenAvailability(
        sessionToken: token.jwt,
        availabilityStatus: nextStatus,
      );
      if (!mounted) return;
      setState(() {
        _profile = _profile!.copyWith(availabilityStatus: resolved);
        _availabilityBusy = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_availabilitySavedMessage(resolved))),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _availabilityBusy = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(friendlyErrorMessage(error))));
    }
  }

  Future<void> _openTakkaFamily() async {
    await openExternalLink(
      context,
      Uri.parse(takkaPartnersCommunityUrl),
      failureMessage: whatsAppLinkFailureMessage,
    );
  }

  Future<void> _openFeature(Widget screen) async {
    final access = kitchenFeatureAccessFromStatus(_profile?.approvalStatus);
    if (access == KitchenFeatureAccess.ready) {
      await Navigator.of(
        context,
      ).push(MaterialPageRoute<void>(builder: (_) => screen));
      return;
    }

    final isSetup = access == KitchenFeatureAccess.needsSetup;
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(
            isSetup
                ? kitchenFeatureNeedsSetupTitle
                : kitchenFeatureNeedsApprovalTitle,
          ),
          content: Text(
            isSetup
                ? kitchenFeatureNeedsSetupBody
                : kitchenFeatureNeedsApprovalBody,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('حسنًا'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const KitchenOnboardingScreen(),
                  ),
                );
              },
              child: const Text(kitchenFeatureOpenOnboarding),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final approved = _profile?.approvalStatus == 'APPROVED';
    final availability = _profile?.availabilityStatus ?? 'CLOSED';

    return Scaffold(
      appBar: AppBar(
        title: const Text('تكة - المطبخ'),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const NotificationsScreen(),
                ),
              );
            },
            icon: const Icon(Icons.notifications_none_rounded),
            tooltip: 'الإشعارات',
          ),
          IconButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => KitchenAccountScreen(
                    fallbackName: widget.displayName,
                    onSignOut: widget.onSignOut,
                  ),
                ),
              );
            },
            icon: const Icon(Icons.person_outline_rounded),
            tooltip: 'حسابي',
          ),
          IconButton(
            onPressed: widget.onSwitchRole,
            icon: const Icon(Icons.swap_horiz_rounded),
            tooltip: 'التحول إلى مسار العميل',
          ),
          IconButton(
            onPressed: widget.onSignOut,
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'تسجيل الخروج',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _KitchenIntroCard(displayName: widget.displayName),
          const SizedBox(height: 16),
          if (_profileLoading)
            const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: Center(child: CircularProgressIndicator()),
            )
          else ...[
            if (approved) ...[
              if (_profile?.isSuspended == true) ...[
                _KitchenSuspensionCard(
                  reason: _profile?.suspensionReason,
                  canAcknowledge: _profile?.canAcknowledgeSuspension == true,
                  busy: _ackBusy,
                  onAcknowledge: _acknowledgeSuspension,
                ),
                const SizedBox(height: 16),
              ],
              _KitchenAvailabilityCard(
                status: availability,
                busy: _availabilityBusy,
                onSelect: _setAvailability,
              ),
              const SizedBox(height: 16),
              _TakkaFamilyJoinCard(onJoin: _openTakkaFamily),
              const SizedBox(height: 16),
            ] else if (_profile != null) ...[
              const _KitchenAvailabilityPendingCard(),
              const SizedBox(height: 16),
            ],
          ],
          FilledButton.icon(
            onPressed: () async {
              await Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const KitchenOnboardingScreen(),
                ),
              );
              await _refreshProfile();
            },
            icon: const Icon(Icons.verified_user_outlined),
            label: const Text('إعداد المطبخ'),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () {
              _openFeature(const KitchenMenuManagementScreen());
            },
            icon: const Icon(Icons.restaurant_menu_outlined),
            label: const Text('إدارة المنيو'),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () {
              _openFeature(const KitchenOrdersScreen());
            },
            icon: const Icon(Icons.receipt_long_outlined),
            label: const Text('طلبات المطبخ'),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () {
              _openFeature(const KitchenStatsScreen());
            },
            icon: const Icon(Icons.insights_outlined),
            label: const Text('إحصائيات'),
          ),
          const SizedBox(height: 16),
          const _KitchenActionTile(
            icon: Icons.verified_user_outlined,
            title: 'استكمال الملف والاعتماد',
            description: 'إعداد بيانات المطبخ ورفع المستندات من نفس التطبيق.',
          ),
          const _KitchenActionTile(
            icon: Icons.restaurant_menu_outlined,
            title: 'إدارة المنيو',
            description: 'إضافة الأصناف، تعديل الأسعار، والتحكم في التوفر.',
          ),
          const _KitchenActionTile(
            icon: Icons.local_shipping_outlined,
            title: 'إدارة الطلبات',
            description: 'قبول الطلبات، تحديد رسوم التوصيل، ومتابعة الحالات.',
          ),
          const _KitchenActionTile(
            icon: Icons.insights_outlined,
            title: 'إحصائيات',
            description:
                'طلبات مكتملة وملغاة ومبيعات آخر 30 يومًا أو مدة تختارها.',
          ),
        ],
      ),
    );
  }
}

class _KitchenSuspensionCard extends StatelessWidget {
  const _KitchenSuspensionCard({
    required this.reason,
    required this.canAcknowledge,
    required this.busy,
    required this.onAcknowledge,
  });

  final String? reason;
  final bool canAcknowledge;
  final bool busy;
  final VoidCallback onAcknowledge;

  @override
  Widget build(BuildContext context) {
    final text = reason?.trim().isNotEmpty == true
        ? reason!.trim()
        : 'تم إيقاف استقبال الطلبات. العملاء يشوفون المطبخ مشغول.';
    return Card(
      color: const Color(0xFFFFF7ED),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFFFDBA74)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'استقبال الطلبات متوقف',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(text, style: const TextStyle(height: 1.5)),
            const SizedBox(height: 8),
            Text(
              canAcknowledge
                  ? 'العملاء يشوفون المطبخ مشغول ولا يستطيعون الطلب لحد ما تضغط «فهمت».'
                  : 'العملاء يشوفون المطبخ مشغول. قراءة التنبيه لا تفك هذا الإيقاف، وفريق تكة فقط يقدر يعيد التفعيل.',
              style: const TextStyle(height: 1.5),
            ),
            if (canAcknowledge) ...[
              const SizedBox(height: 14),
              FilledButton(
                onPressed: busy ? null : onAcknowledge,
                child: Text(busy ? 'جاري التأكيد...' : 'فهمت'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _KitchenAvailabilityCard extends StatelessWidget {
  const _KitchenAvailabilityCard({
    required this.status,
    required this.busy,
    required this.onSelect,
  });

  final String status;
  final bool busy;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final title = switch (status) {
      'OPEN' => 'المطبخ مفتوح للعملاء',
      'BUSY' => 'المطبخ مشغول',
      _ => 'المطبخ مغلق',
    };
    final body = switch (status) {
      'OPEN' =>
        'يظهر مطبخك للعملاء ويمكنهم إرسال طلبات. الحالة تفضل مفتوح لحد ما تغيّرها بنفسك.',
      'BUSY' =>
        'يظهر مطبخك للعملاء كـ «مشغول» ولا يستقبل طلبات جديدة. الحالة تفضل مشغول لحد ما تغيّرها بنفسك.',
      _ => 'لن يظهر مطبخك في استعراض المطابخ ولن يستقبل طلبات جديدة.',
    };
    final openTone = status == 'OPEN';

    return Card(
      color: openTone ? const Color(0xFFECFDF5) : const Color(0xFFFFF8F1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(
          color: openTone ? const Color(0xFFA7F3D0) : const Color(0xFFE8D5C4),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(body, style: TextStyle(height: 1.5, color: Colors.grey.shade800)),
            const SizedBox(height: 14),
            Row(
              children: [
                for (final option in const [
                  ('OPEN', 'مفتوح'),
                  ('BUSY', 'مشغول'),
                  ('CLOSED', 'مغلق'),
                ])
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: option.$1 == status
                          ? FilledButton(
                              onPressed: null,
                              child: Text(busy ? '...' : option.$2),
                            )
                          : OutlinedButton(
                              onPressed: busy ? null : () => onSelect(option.$1),
                              child: Text(option.$2),
                            ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _KitchenAvailabilityPendingCard extends StatelessWidget {
  const _KitchenAvailabilityPendingCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFFFFF8F1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFFE8D5C4)),
      ),
      child: const Padding(
        padding: EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'فتح المطبخ للعملاء',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            SizedBox(height: 8),
            Text(
              'بعد موافقة الإدارة يمكنك فتح استقبال الطلبات ليظهر مطبخك للعملاء.',
              style: TextStyle(height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}

class _TakkaFamilyJoinCard extends StatelessWidget {
  const _TakkaFamilyJoinCard({required this.onJoin});

  final VoidCallback onJoin;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFFECFDF5),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFFA7F3D0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: TakkaColors.primary.withValues(alpha: 0.15),
                  child: Icon(
                    Icons.groups_2_outlined,
                    color: TakkaColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    takkaFamilyJoinTitle,
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(takkaFamilyJoinBody, style: TextStyle(height: 1.55)),
            const SizedBox(height: 8),
            Text(
              takkaFamilyJoinNote,
              style: TextStyle(
                fontSize: 12,
                height: 1.45,
                color: Colors.grey.shade800,
              ),
            ),
            const SizedBox(height: 14),
            FilledButton(
              onPressed: onJoin,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF25D366),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Text(takkaFamilyJoinTitle),
            ),
          ],
        ),
      ),
    );
  }
}

class _KitchenIntroCard extends StatelessWidget {
  const _KitchenIntroCard({required this.displayName});

  final String displayName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [TakkaColors.deep, Color(0xFF3A2419), TakkaColors.secondary],
        ),
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: TakkaColors.secondary.withValues(alpha: 0.25),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Image.asset(
                  'assets/branding/takka_icon.png',
                  width: 44,
                  height: 44,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'تكة',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            'مرحبًا $displayName',
            style: theme.textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'من هنا تكمل بيانات مطبخك، تدير المنيو، وتستقبل الطلبات وتحدّث حالتها.',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: Colors.white.withValues(alpha: 0.90),
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}

class _KitchenActionTile extends StatelessWidget {
  const _KitchenActionTile({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(18),
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.12),
          child: Icon(icon, color: theme.colorScheme.primary),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(
            description,
            style: TextStyle(color: Colors.grey.shade700, height: 1.5),
          ),
        ),
      ),
    );
  }
}
