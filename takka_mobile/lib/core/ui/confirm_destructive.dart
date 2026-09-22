import 'package:flutter/material.dart';

/// Shows a destructive confirmation dialog. Returns true if the user confirms.
Future<bool> confirmDestructive(
  BuildContext context, {
  required String title,
  required String message,
  String confirmLabel = 'حذف',
  String cancelLabel = 'إلغاء',
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (dialogContext) {
      return AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(cancelLabel),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red.shade700),
            child: Text(confirmLabel),
          ),
        ],
      );
    },
  );
  return result == true;
}
