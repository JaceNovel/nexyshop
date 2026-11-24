import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/ui.dart';
import 'account_destinations.dart';

/// Order tracking: status header, 3-step timeline, details, delivery codes. Refreshes itself until final.
class OrderTrackingScreen extends StatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId, this.initial});
  final String orderId;
  final Map<String, dynamic>? initial;

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  Map<String, dynamic>? _o;
  String? _error;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _o = widget.initial;
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
    _poll = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!_final) _load();
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  /// Normalized statuses: payment_pending, manual_processing, supplier_submitted, delivered, failed, cancelled, refunded, verification.
  bool get _final => ['delivered', 'refunded', 'failed', 'cancelled'].contains(_status);

  String get _status => (_o ?? const <String, dynamic>{}).str('status');

  Future<void> _load() async {
    try {
      final res = await AppScope.read(context).api.get('/api/orders/${widget.orderId}/tracking');
      final m = res is Map ? Map<String, dynamic>.from(res) : <String, dynamic>{};
      if (mounted) setState(() {
        _o = {...?_o, ...m};
        _error = null;
      });
      if (_final) _poll?.cancel();
    } on ApiException catch (e) {
      if (mounted && _o == null) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = _o;
    return Scaffold(
      appBar: AppBar(title: Text(o == null ? 'Commande' : orderReference(o))),
      body: o == null
          ? (_error != null ? ErrorView(message: _error!, onRetry: _load) : const LoadingView())
          : ListView(padding: const EdgeInsets.fromLTRB(12, 12, 12, 32), children: _content(o)),
    );
  }

  List<Widget> _content(Map<String, dynamic> o) {
    final st = _status;
    final paid = !['payment_pending', ''].contains(st) && !(st == 'cancelled' && o.str('paymentStatus') != 'success');
    final sent = ['supplier_submitted', 'manual_processing', 'delivered'].contains(st);
    final delivered = st == 'delivered';
    final failed = st == 'failed' || st == 'cancelled';
    final refunded = st == 'refunded';
    final (title, icon, color, bg) = delivered
        ? ('Commande livrée', Icons.check, AppColors.green, AppColors.greenSoft)
        : refunded
            ? ('Commande remboursée', Icons.replay, AppColors.slate, const Color(0xFFEFF1F5))
            : failed
                ? ('Commande échouée', Icons.close, AppColors.red, AppColors.redSoft)
                : paid
                    ? ('Commande en traitement', Icons.autorenew, AppColors.blue, const Color(0xFFE8EEFB))
                    : ('Paiement en attente', Icons.schedule, AppColors.blue, const Color(0xFFE8EEFB));
    final payment = o.strOrNull('paymentStatus') ?? (paid ? 'success' : 'pending');
    final supplier = o.strOrNull('supplierStatus');
    final ref = o.strOrNull('supplierReference');
    final codes = _codes(o);

    return [
      A4Card(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
        child: Column(children: [
          Container(width: 66, height: 66, decoration: BoxDecoration(color: bg, shape: BoxShape.circle), child: Icon(icon, color: color, size: 34)),
          const SizedBox(height: 14),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.slate)),
          const SizedBox(height: 10),
          Text(orderProductName(o), textAlign: TextAlign.center, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: AppColors.slate)),
          const SizedBox(height: 10),
          Text(formatMoney(o.number('amount'), o.str('currency', 'XOF')),style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.slate)),
        ]),
      ),
      const SizedBox(height: 10),
      A4Card(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        child: Column(children: [
          _step('Paiement confirmé', paid ? 2 : 1, line: paid),
          _step('Commande transmise', delivered || sent ? 2 : (paid ? 1 : 0), line: delivered),
          _step('Livraison', delivered ? 2 : (sent && !delivered ? 1 : 0), last: true),
        ]),
      ),
      const SizedBox(height: 10),
      A4Card(
        padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
        child: Column(children: [
          _info('Commande', orderReference(o)),
          _info('Paiement', payment),
          if (supplier != null) _info('Fournisseur', supplier),
          if (ref != null) _info('Référence livraison', ref),
        ]),
      ),
      if (!_final)
        const Padding(
          padding: EdgeInsets.only(top: 18),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.red)),
            SizedBox(width: 14),
            Text('Mise à jour automatique...', style: TextStyle(fontSize: 16, color: AppColors.slate, fontWeight: FontWeight.w500)),
          ]),
        ),
      if (codes.isNotEmpty) ...[
        const SectionTitle('Votre code'),
        for (final c in codes) ...[
          Container(
            padding: const EdgeInsets.fromLTRB(10, 12, 10, 10),
            decoration: BoxDecoration(color: const Color(0xFFEFFAF4), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFD3EEDF))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text(c.$1, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: AppColors.slate)),
              const SizedBox(height: 6),
              SelectableText(c.$2, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: AppColors.slate, letterSpacing: .5)),
              const SizedBox(height: 10),
              FilledButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: c.$2));
                  showSnack(context, 'Code copié');
                },
                icon: const Icon(Icons.copy_outlined),
                label: const Text('Copier le code'),
              ),
            ]),
          ),
          const SizedBox(height: 10),
        ],
      ],
      const SizedBox(height: 20),
      OutlinedButton.icon(
        onPressed: () {
          final nav = Navigator.of(context);
          nav.pop();
          if (ModalRoute.of(context)?.settings.name != 'orders') nav.push(MaterialPageRoute(settings: const RouteSettings(name: 'orders'), builder: (_) => const OrdersScreen()));
        },
        icon: const Icon(Icons.receipt_long_outlined),
        label: const Text('Retour à mes commandes'),
      ),
    ];
  }

  /// (label, code) pairs from `delivery_codes` (strings, maps or nested lists).
  List<(String, String)> _codes(Map<String, dynamic> o) {
    final raw = o['deliveryCodes'];
    final out = <(String, String)>[];
    void walk(dynamic v, String label) {
      if (v == null) return;
      if (v is String || v is num) {
        final s = '$v'.trim();
        if (s.isNotEmpty) out.add((label, s));
      } else if (v is List) {
        for (final e in v) {
          walk(e, label);
        }
      } else if (v is Map) {
        final code = v['value'] ?? v['code'] ?? v['pin'] ?? v['serial'];
        if (code != null) {
          out.add(('${v['label'] ?? v['type'] ?? label}', '$code'));
        } else {
          v.forEach((k, x) => walk(x, '$k'));
        }
      }
    }

    walk(raw, 'code');
    return out;
  }

  /// state: 0 todo, 1 current, 2 done.
  Widget _step(String label, int state, {bool line = false, bool last = false}) {
    final dot = state == 2
        ? Container(width: 30, height: 30, decoration: const BoxDecoration(color: AppColors.green, shape: BoxShape.circle), child: const Icon(Icons.check, color: Colors.white, size: 18))
        : state == 1
            ? Container(width: 30, height: 30, decoration: const BoxDecoration(color: AppColors.orange, shape: BoxShape.circle), child: const Icon(Icons.more_horiz, color: Colors.white, size: 18))
            : Container(width: 30, height: 30, decoration: BoxDecoration(color: const Color(0xFFEFF2F6), shape: BoxShape.circle, border: Border.all(color: const Color(0xFFDDE3EA), width: 6)));
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Column(children: [
          dot,
          if (!last) Expanded(child: Container(width: 3, color: line ? AppColors.green : const Color(0xFFE3E8EF))),
        ]),
        const SizedBox(width: 16),
        Padding(
          padding: EdgeInsets.only(top: 4, bottom: last ? 0 : 22),
          child: Text(label, style: TextStyle(fontSize: 17, fontWeight: state == 0 ? FontWeight.w600 : FontWeight.w800, color: state == 0 ? AppColors.slate : AppColors.ink)),
        ),
      ]),
    );
  }

  Widget _info(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 7),
        child: Row(children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.slate))),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.slate))),
        ]),
      );
}
