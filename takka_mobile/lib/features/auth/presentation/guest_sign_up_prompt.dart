import 'package:flutter/material.dart';

import '../presentation/custom_auth_screen.dart';

/// Shows guest gate: "قم بالتسجيل أولا" + "سجل الآن" → customer sign-up.
Future<void> showGuestSignUpPrompt(BuildContext context) {
  return showDialog<void>(
    context: context,
    builder: (dialogContext) {
      return AlertDialog(
        title: const Text('قم بالتسجيل أولا'),
        content: const Text(
          'التصفح متاح للزائر. لإكمال هذه الخطوة سجّل كعميل.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('إغلاق'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const CustomAuthScreen(
                    initialMode: AuthMode.signUp,
                  ),
                ),
              );
            },
            child: const Text(
              'سجل الآن',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: Color(0xFFC45C26),
              ),
            ),
          ),
        ],
      );
    },
  );
}
