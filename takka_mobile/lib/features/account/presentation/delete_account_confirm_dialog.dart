import 'package:flutter/material.dart';

import '../../../core/auth/session_token.dart';
import '../../../core/theme/app_theme.dart';
import '../data/account_deletion_service.dart';

/// Confirm «هل أنت متأكد من حذف حسابك» then permanently delete via API.
Future<void> runDeleteAccountFlow(
  BuildContext context, {
  required VoidCallback onDeleted,
}) async {
  final go = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (dialogContext) {
      return AlertDialog(
        title: const Text('هل أنت متأكد من حذف حسابك'),
        content: const Text(
          'سيتم حذف الحساب نهائيًا ولن تتمكن من استرجاعه. إذا كان لديك مطبخ فسيُغلق ويختفي من الاكتشاف.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFC62828),
              foregroundColor: Colors.white,
            ),
            child: const Text('تأكيد الحذف'),
          ),
        ],
      );
    },
  );

  if (go != true || !context.mounted) return;

  showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const Center(
      child: Card(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: CircularProgressIndicator(color: TakkaColors.primary),
        ),
      ),
    ),
  );

  try {
    final jwt = await requireSessionJwt(context);
    await const AccountDeletionService().deleteAccount(sessionToken: jwt);
    if (context.mounted) {
      Navigator.of(context, rootNavigator: true).pop();
      onDeleted();
    }
  } catch (error) {
    if (context.mounted) {
      Navigator.of(context, rootNavigator: true).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error is Exception
                ? error.toString().replaceFirst('Exception: ', '')
                : 'تعذر حذف الحساب.',
          ),
        ),
      );
    }
  }
}
