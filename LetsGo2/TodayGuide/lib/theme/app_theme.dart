import 'package:flutter/material.dart';

/// 오늘의 지침서 - 우주/SF 컨셉 디자인 토큰
abstract final class AppColors {
  static const deepSpace = Color(0xFF05060F);
  static const spacePanel = Color(0xFF0E1027);
  static const spacePanelAlt = Color(0xFF161A3A);
  static const neonCyan = Color(0xFF4CF2E8);
  static const neonPurple = Color(0xFFB388FF);
  static const neonMagenta = Color(0xFFFF5FA2);
  static const starDim = Color(0x554CF2E8);
  static const textPrimary = Color(0xFFEAF0FF);
  static const textSecondary = Color(0xFF8C93C4);
  static const warning = Color(0xFFFFC857);
  static const danger = Color(0xFFFF6B6B);
}

class AppTheme {
  AppTheme._();

  static ThemeData get dark {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.deepSpace,
      colorScheme: base.colorScheme.copyWith(
        primary: AppColors.neonCyan,
        secondary: AppColors.neonPurple,
        surface: AppColors.spacePanel,
        error: AppColors.danger,
      ),
      textTheme: base.textTheme.apply(
        bodyColor: AppColors.textPrimary,
        displayColor: AppColors.textPrimary,
        fontFamily: 'monospace',
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.2,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.spacePanel,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppColors.starDim, width: 1),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.neonCyan,
          foregroundColor: AppColors.deepSpace,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          textStyle: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.spacePanelAlt,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
