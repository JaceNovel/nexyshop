import 'package:flutter/material.dart';

/// Colours and theme of the Astral4Gamer app (Material 3, red seed), matched on the v1.1.48 screens.
class AppColors {
  static const red = Color(0xFFE30A17);
  static const redSoft = Color(0xFFFDE7E8);
  static const blue = Color(0xFF1A5FD0);
  static const blueSoft = Color(0xFFF1F5FD);
  static const green = Color(0xFF10B981);
  static const greenSoft = Color(0xFFE8F8F1);
  static const orange = Color(0xFFF59E0B);
  static const orangeSoft = Color(0xFFFFF6E5);
  static const gold = Color(0xFFF2A60C);
  static const page = Color(0xFFF4F6FA);
  static const card = Colors.white;
  static const border = Color(0xFFE3E8EF);
  static const ink = Color(0xFF0B1220);
  static const text = Color(0xFF2B2B33);
  static const slate = Color(0xFF5F6B7E);
  static const muted = Color(0xFF6B7280);
  static const dark = Color(0xFF0B1220);
}

class AppTheme {
  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(seedColor: AppColors.red, primary: AppColors.red, brightness: Brightness.light);
    final base = ThemeData(useMaterial3: true, colorScheme: scheme, fontFamily: 'Roboto');
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.page,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        centerTitle: false,
        titleSpacing: 12,
        titleTextStyle: TextStyle(fontFamily: 'Roboto', fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.ink),
      ),
      cardTheme: CardThemeData(
        color: AppColors.card,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.border)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.red,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.red,
          minimumSize: const Size.fromHeight(48),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: AppColors.red, textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        hintStyle: const TextStyle(color: AppColors.muted, fontSize: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.red, width: 1.4)),
      ),
      listTileTheme: const ListTileThemeData(
        titleTextStyle: TextStyle(fontFamily: 'Roboto', fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.text),
        subtitleTextStyle: TextStyle(fontFamily: 'Roboto', fontSize: 14.5, fontWeight: FontWeight.w500, color: AppColors.text),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.border, thickness: 1),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    );
  }
}
