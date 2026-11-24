import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../services/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/ui.dart';
import 'account_destinations.dart';

/// "Récompenses VIP": current level banner, cashback, purchases and the level ladder.
class VipScreen extends StatefulWidget {
  const VipScreen({super.key});
  @override
  State<VipScreen> createState() => _VipScreenState();
}

class _VipScreenState extends State<VipScreen> {
  late Future<Map<String, dynamic>> _f = AppScope.read(context).api.get('/api/user/vip').then(asMap);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Récompenses VIP')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _f,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) return const LoadingView();
          if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _f = AppScope.read(context).api.get('/api/user/vip').then(asMap)));
          final v = vipView(snap.data!);
          Widget stat(String label, String value) => A4Card(
                padding: const EdgeInsets.fromLTRB(12, 16, 12, 14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(label, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
                  const SizedBox(height: 8),
                  Text(value, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: AppColors.slate)),
                ]),
              );
          return ListView(padding: const EdgeInsets.fromLTRB(12, 10, 12, 24), children: [
            Container(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
              decoration: BoxDecoration(color: AppColors.dark, borderRadius: BorderRadius.circular(10)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.workspace_premium, color: AppColors.gold, size: 36),
                const SizedBox(height: 20),
                Text(v.level.toUpperCase(), style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Colors.white)),
                const SizedBox(height: 10),
                const Text('Votre fidélité vous rapporte des crédits et des avantages.', style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600, color: Color(0xFFE6E8EE))),
              ]),
            ),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: stat('Cashback disponible', formatMoney(v.cashback))),
              const SizedBox(width: 8),
              Expanded(child: stat('Achats éligibles', '${v.purchases}')),
            ]),
            const SizedBox(height: 8),
            stat('Montant cumulé', formatMoney(v.spent)),
            if (v.tiers.isNotEmpty) ...[
              const SectionTitle('Niveaux et avantages'),
              for (final t in v.tiers) ...[
                _tier(t, t.str('name').toLowerCase() == v.level.toLowerCase()),
                const SizedBox(height: 2),
              ],
            ],
          ]);
        },
      ),
    );
  }

  Widget _tier(Map<String, dynamic> t, bool current) {
    String pct(List<String> keys) {
      for (final k in keys) {
        if (t.containsKey(k)) {
          final n = t.number(k);
          return '${n % 1 == 0 ? n.toInt() : n}%';
        }
      }
      return '0%';
    }

    final cashback = pct(['cashbackPercent']);
    final discount = pct(['discountPercent']);
    final minOrders = t.integer('minOrders');
    final minAmount = (t.number('minSpend') * AppState.xofPerUsd).round();
    return A4Card(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(current ? Icons.verified : Icons.workspace_premium_outlined, color: current ? AppColors.red : AppColors.slate, size: 28),
        const SizedBox(width: 20),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(t.str('name'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 4),
            Text('$cashback cashback · $discount réduction', style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w500, color: Color(0xFF4A4040))),
            const SizedBox(height: 2),
            Text('Dès $minOrders achats et ${formatMoney(minAmount)}', style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w500, color: Color(0xFF4A4040))),
          ]),
        ),
      ]),
    );
  }
}
