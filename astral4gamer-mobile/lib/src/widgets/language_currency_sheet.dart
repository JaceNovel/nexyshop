import 'package:flutter/material.dart';

import '../services/app_scope.dart';
import '../theme/app_theme.dart';

/// "Langue et devise" bottom sheet opened from the globe button of the home header.
Future<void> showLanguageCurrencySheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: const Color(0xFFFFF1F0),
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
    builder: (_) => const _Sheet(),
  );
}

class _Sheet extends StatefulWidget {
  const _Sheet();
  @override
  State<_Sheet> createState() => _SheetState();
}

class _SheetState extends State<_Sheet> {
  late String _lang = AppScope.read(context).language;
  late String _cur = AppScope.read(context).currency;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Langue et devise', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.ink)),
            const SizedBox(height: 20),
            const Text('Langue', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.slate)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: _langBox('fr', 'FR', 'Français')),
              const SizedBox(width: 6),
              Expanded(child: _langBox('en', 'EN', 'English')),
            ]),
            const SizedBox(height: 22),
            const Text('Devise des prix', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.slate)),
            const SizedBox(height: 8),
            _currency('EUR', '€', 'EUR', 'Euro'),
            const SizedBox(height: 6),
            _currency('XOF', 'F', 'FCFA', 'Franc CFA'),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: () async {
                await AppScope.read(context).setLanguageAndCurrency(_lang, _cur);
                if (context.mounted) Navigator.pop(context);
              },
              child: const Text('Appliquer'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _langBox(String code, String short, String label) {
    final sel = _lang == code;
    return InkWell(
      onTap: () => setState(() => _lang = code),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: sel ? const Color(0xFFFDE3E1) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: sel ? AppColors.red : AppColors.border, width: sel ? 1.2 : 1),
        ),
        child: Row(children: [
          Text(short, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.slate)),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.slate))),
          if (sel) const Icon(Icons.check_circle, color: AppColors.red, size: 22),
        ]),
      ),
    );
  }

  Widget _currency(String code, String symbol, String title, String subtitle) {
    final sel = _cur == code;
    return InkWell(
      onTap: () => setState(() => _cur = code),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(color: sel ? const Color(0xFFFDE3E1) : Colors.transparent, borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          CircleAvatar(
            radius: 14 * 1.0 + 14,
            backgroundColor: sel ? AppColors.red : const Color(0xFFF4F6FA),
            child: Text(symbol, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: sel ? Colors.white : AppColors.ink)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w500, color: sel ? AppColors.red : AppColors.text)),
              Text(subtitle, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: sel ? AppColors.red : AppColors.text)),
            ]),
          ),
          if (sel) const Icon(Icons.check_circle, color: AppColors.red, size: 24),
        ]),
      ),
    );
  }
}
