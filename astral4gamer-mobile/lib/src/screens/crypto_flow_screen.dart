import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/ui.dart';
import 'order_tracking_screen.dart';

/// Crypto payment (USDT): choose the network, then send the exact amount to the deposit address.
/// Used for an order ([orderId]) or a wallet top-up ([topupAmount] in XOF).
class CryptoFlowScreen extends StatefulWidget {
  const CryptoFlowScreen({super.key, this.orderId, this.amount = 0, this.topupAmount});
  final String? orderId;
  final num amount;
  final num? topupAmount;

  @override
  State<CryptoFlowScreen> createState() => _CryptoFlowScreenState();
}

class _CryptoFlowScreenState extends State<CryptoFlowScreen> {
  static const _networks = ['TRC20', 'BEP20', 'ERC20', 'TON', 'APT'];
  String _network = 'TRC20';
  Map<String, dynamic>? _intent;
  bool _busy = false;
  Timer? _poll;

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _create() async {
    setState(() => _busy = true);
    try {
      final topup = widget.topupAmount != null;
      final res = await AppScope.read(context).api.post('/api/payments/crypto/intents', {
        'purpose': topup ? 'wallet_topup' : 'checkout',
        if (!topup) 'order_id': int.tryParse(widget.orderId!) ?? widget.orderId,
        if (topup) 'amount': widget.topupAmount,
        'currency': 'XOF',
        'crypto_currency': 'USDT',
        'network': _network,
      });
      setState(() => _intent = asMap(res));
      _poll = Timer.periodic(const Duration(seconds: 10), (_) => _refresh());
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _refresh() async {
    final id = _intent?.str('id');
    if (id == null) return;
    try {
      final res = await AppScope.read(context).api.get('/api/payments/crypto/intents/$id');
      if (!mounted) return;
      setState(() => _intent = asMap(res));
      if (_intent!.str('status') == 'confirmed') {
        _poll?.cancel();
        showSnack(context, 'Paiement crypto confirmé.');
        if (widget.orderId != null) {
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: widget.orderId!)));
        } else {
          AppScope.read(context).refreshSummary();
          Navigator.pop(context);
        }
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final i = _intent;
    return Scaffold(
      appBar: AppBar(title: const Text('Paiement crypto')),
      body: ListView(padding: const EdgeInsets.fromLTRB(12, 8, 12, 24), children: [
        Text(AppScope.of(context).money(widget.topupAmount ?? widget.amount), style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: AppColors.ink)),
        const SizedBox(height: 6),
        const Text('Paye en USDT sur le réseau de ton choix.', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.slate)),
        const SizedBox(height: 16),
        if (i == null) ...[
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final n in _networks)
              ChoiceChip(
                label: Text('USDT $n'),
                selected: _network == n,
                selectedColor: AppColors.redSoft,
                onSelected: (_) => setState(() => _network = n),
              ),
          ]),
          const SizedBox(height: 18),
          FilledButton(onPressed: _busy ? null : _create, child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Obtenir l’adresse de paiement')),
        ] else ...[
          A4Card(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _row('Montant à envoyer', '${i.number('expected_crypto_amount')} ${i.str('crypto_currency', 'USDT')}'),
              _row('Réseau', i.str('network', _network)),
              _row('Référence', i.str('reference')),
              _row('Statut', i.str('status') == 'confirmed' ? 'Confirmé' : 'En attente du dépôt'),
              const SizedBox(height: 12),
              const Text('Adresse de dépôt', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate)),
              const SizedBox(height: 6),
              SelectableText(i.str('deposit_address'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.ink)),
              if (i.strOrNull('deposit_memo') != null) ...[const SizedBox(height: 6), Text('Mémo : ${i.str('deposit_memo')}', style: const TextStyle(fontWeight: FontWeight.w700))],
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: i.str('deposit_address')));
                  showSnack(context, 'Adresse copiée');
                },
                icon: const Icon(Icons.copy_outlined),
                label: const Text('Copier l’adresse'),
              ),
            ]),
          ),
          const SizedBox(height: 12),
          const InfoCard('Envoie exactement le montant indiqué, sur ce réseau uniquement. Le paiement est confirmé automatiquement après réception.'),
          const SizedBox(height: 12),
          OutlinedButton.icon(onPressed: _refresh, icon: const Icon(Icons.refresh), label: const Text('Vérifier le paiement')),
        ],
      ]),
    );
  }

  Widget _row(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(children: [
          Expanded(child: Text(k, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.slate))),
          Flexible(child: Text(v, textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.slate))),
        ]),
      );
}
