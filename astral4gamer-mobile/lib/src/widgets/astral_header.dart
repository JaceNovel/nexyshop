import 'package:flutter/material.dart';

import '../screens/app_shell.dart';
import '../screens/launch_welcome_screen.dart';
import '../screens/notifications_screen.dart';
import '../screens/wallet_screen.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import 'language_currency_sheet.dart';

/// Home header: logo + wordmark, wallet balance pill, language globe, notifications bell.
class AstralHeader extends StatelessWidget {
  const AstralHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return Column(children: [
      Row(children: [
        Image.asset('assets/images/astral-logo.png', height: 40),
        const SizedBox(width: 4),
        const Wordmark(size: 24),
      ]),
      const SizedBox(height: 10),
      Row(mainAxisAlignment: MainAxisAlignment.end, children: [
        Material(
          color: AppColors.red,
          shape: const StadiumBorder(),
          child: InkWell(
            customBorder: const StadiumBorder(),
            onTap: () {
              if (!state.loggedIn) return AppShell.of(context)?.go(4);
              Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen()));
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.toll_outlined, color: Colors.white, size: 22),
                const SizedBox(width: 8),
                Text(state.money(state.walletBalance), style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800)),
              ]),
            ),
          ),
        ),
        const SizedBox(width: 8),
        InkWell(
          onTap: () => showLanguageCurrencySheet(context),
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(6),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.language, size: 28, color: AppColors.ink),
              Text(state.language.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF1E3A8A))),
            ]),
          ),
        ),
        const SizedBox(width: 4),
        IconButton(
          icon: Badge(isLabelVisible: state.unreadNotifications > 0, label: Text('${state.unreadNotifications}'), child: const Icon(Icons.notifications_none, size: 30)),
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
        ),
      ]),
    ]);
  }
}
