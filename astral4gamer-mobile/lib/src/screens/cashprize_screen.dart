import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/ui.dart';

/// Cashprize campaigns (none open at the moment: the original app also shows "Campagne indisponible").
class CashprizeScreen extends StatelessWidget {
  const CashprizeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cashprize')),
      body: ListView(padding: const EdgeInsets.fromLTRB(12, 12, 12, 24), children: [
        Container(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
          decoration: BoxDecoration(color: const Color(0xFFFFF8EC), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFF2D7A6))),
          child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(Icons.workspace_premium, color: AppColors.gold, size: 38),
            SizedBox(height: 12),
            Text('Campagne indisponible', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.slate)),
            SizedBox(height: 6),
            Text('Découvrir les prochaines campagnes et récompenses.', style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
          ]),
        ),
        const SizedBox(height: 12),
        const InfoCard('Active les notifications pour être prévenu dès l’ouverture de la prochaine campagne.'),
      ]),
    );
  }
}
