import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TakkaColors {
  static const cream = Color(0xFFFFF8F1);
  static const ink = Color(0xFF3B2418);
  static const muted = Color(0xFF7A5644);
  static const primary = Color(0xFFE67E22);
  static const secondary = Color(0xFFC65D2E);
  static const deep = Color(0xFF1F1410);
  static const softLine = Color(0xFFEAD9C8);
}

ThemeData buildTakkaTheme() {
  final baseText = GoogleFonts.cairoTextTheme();
  final scheme = ColorScheme.fromSeed(
    seedColor: TakkaColors.primary,
    brightness: Brightness.light,
    primary: TakkaColors.primary,
    secondary: TakkaColors.secondary,
    surface: Colors.white,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: TakkaColors.cream,
    textTheme: baseText.apply(
      bodyColor: TakkaColors.ink,
      displayColor: TakkaColors.ink,
    ),
    appBarTheme: AppBarTheme(
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      backgroundColor: TakkaColors.cream,
      foregroundColor: TakkaColors.ink,
      titleTextStyle: GoogleFonts.cairo(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: TakkaColors.ink,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: TakkaColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
        ),
        textStyle: GoogleFonts.cairo(
          fontWeight: FontWeight.w700,
          fontSize: 15,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: TakkaColors.ink,
        side: const BorderSide(color: TakkaColors.softLine),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
        ),
        textStyle: GoogleFonts.cairo(fontWeight: FontWeight.w700),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      hintStyle: GoogleFonts.cairo(color: TakkaColors.muted),
      labelStyle: GoogleFonts.cairo(color: TakkaColors.muted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: TakkaColors.softLine),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: TakkaColors.softLine),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: TakkaColors.primary, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: Colors.white,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(26),
        side: const BorderSide(color: TakkaColors.softLine),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: TakkaColors.deep,
      contentTextStyle: GoogleFonts.cairo(color: Colors.white),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  );
}
