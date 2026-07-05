import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// 확인 버튼을 눌러야만 닫히는 공용 알럿 다이얼로그.
/// SnackBar와 달리 자동으로 사라지지 않아 에러 메시지를 놓치지 않게 한다.
Future<void> showAppAlertDialog(
  BuildContext context, {
  required String title,
  required String message,
}) {
  return showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      backgroundColor: AppColors.spacePanel,
      title: Text(title, style: const TextStyle(color: AppColors.textPrimary, fontSize: 16)),
      content: Text(message, style: const TextStyle(color: AppColors.textSecondary)),
      actions: [
        FilledButton(
          onPressed: () => Navigator.of(dialogContext).pop(),
          child: const Text('확인'),
        ),
      ],
    ),
  );
}
