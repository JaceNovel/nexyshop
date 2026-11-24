import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/ui.dart';
import 'crypto_flow_screen.dart';

/// Wallet: balance, top-up, last transactions.
class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});
  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  late Future<Map<String, dynamic>> _f = _load();
  Future<Map<String, dynamic>> _load() async => asMap(await AppScope.read(context).api.get('/api/user/wallet'));

  static const _labels = {
    'purchase': 'Achat',
    'deposit': 'Recharge',
    'supplier_refund': 'Remboursement',
    'gift_refund': 'Remboursement A4G Gifts',
    'cashback': 'Cashback',
    'bonus': 'Bonus',
    'admin_correction': 'Correction',
    'promotion_failure_credit': 'Crédit promotion',
  };

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Wallet')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _f,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) return const LoadingView();
          if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _f = _load()));
          final w = snap.data!;
          final tx = w.list('transactions');
          return RefreshIndicator(
            color: AppColors.red,
            onRefresh: () async => setState(() => _f = _load()),
            child: ListView(padding: const EdgeInsets.fromLTRB(12, 12, 12, 24), children: [
              Container(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
                decoration: BoxDecoration(color: AppColors.red, borderRadius: BorderRadius.circular(14)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Row(children: [
                    Icon(Icons.account_balance_wallet_outlined, color: Colors.white),
                    SizedBox(width: 10),
                    Text('Solde disponible', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                  ]),
                  const SizedBox(height: 12),
                  Text(state.money(w.number('balance')), style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900)),
                ]),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: () async {
                  await Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletTopupScreen()));
                  if (mounted) setState(() => _f = _load());
                },
                icon: const Icon(Icons.add),
                label: const Text('Recharger mon wallet'),
              ),
              const SectionTitle('Historique'),
              if (tx.isEmpty) const InfoCard('Aucune transaction pour le moment.'),
              for (final t in tx) ...[
                A4Card(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                  child: Row(children: [
                    Icon(t.number('amount') < 0 ? Icons.arrow_upward : Icons.arrow_downward, color: t.number('amount') < 0 ? AppColors.red : AppColors.green),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(_labels[t.str('type')] ?? t.str('type'), style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.text)),
                        if (t.strOrNull('reason') != null) Text(t.str('reason'), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13.5, color: AppColors.slate)),
                        Text(formatDate(t.str('createdAt').replaceFirst(' ', 'T')), style: const TextStyle(fontSize: 12.5, color: AppColors.muted)),
                      ]),
                    ),
                    Text('${t.number('amount') > 0 ? '+' : ''}${state.money(t.number('amount'))}', style: TextStyle(fontWeight: FontWeight.w800, color: t.number('amount') < 0 ? AppColors.red : AppColors.green)),
                  ]),
                ),
                const SizedBox(height: 8),
              ],
            ]),
          );
        },
      ),
    );
  }
}

/// Wallet top-up: amount, then card / Mobile Money (provider page) or crypto.
class WalletTopupScreen extends StatefulWidget {
  const WalletTopupScreen({super.key});
  @override
  State<WalletTopupScreen> createState() => _WalletTopupScreenState();
}

class _WalletTopupScreenState extends State<WalletTopupScreen> {
  final _amount = TextEditingController(text: '5000');
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  num get _value => num.tryParse(_amount.text.replaceAll(RegExp(r'\s'), '')) ?? 0;

  Future<void> _pay(String method) async {
    if (_value < 100) return showSnack(context, 'Le montant minimum est de 100 FCFA.');
    final state = AppScope.read(context);
    final u = state.user ?? const <String, dynamic>{};
    final parts = state.displayName.trim().split(RegExp(r'\s+'));
    setState(() => _busy = true);
    try {
      final res = await state.api.post('/api/payments/wallet/topup', {
        'amount': _value,
        'currency': 'XOF',
        'methods': [method],
        'mobile': true,
        'customer': {
          'email': u.str('email'),
          'first_name': parts.first.isEmpty ? 'Client' : parts.first,
          'last_name': parts.length > 1 ? parts.sublist(1).join(' ') : 'Astral',
          'language': state.language,
        },
        if (method == 'card') 'payment_option': 'stripe:card',
      });
      final m = res is Map ? Map<String, dynamic>.from(res) : <String, dynamic>{};
      final url = m.str('checkout_url');
      final ref = m.obj('payment').str('reference');
      if (url.isEmpty) throw ApiException('Impossible d’ouvrir le paiement.');
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      if (mounted && ref.isNotEmpty) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => WalletTopupPendingScreen(reference: ref)));
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Recharger le wallet')),
      body: AbsorbPointer(
        absorbing: _busy,
        child: ListView(padding: const EdgeInsets.fromLTRB(12, 12, 12, 24), children: [
          const Text('Choisis le montant à créditer sur ton wallet.', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.slate)),
          const SizedBox(height: 12),
          TextField(controller: _amount, keyboardType: TextInputType.number, onChanged: (_) => setState(() {}), decoration: const InputDecoration(suffixText: 'FCFA', labelText: 'Montant')),
          const SizedBox(height: 10),
          Wrap(spacing: 8, children: [
            for (final v in [1000, 2000, 5000, 10000, 25000])
              ActionChip(label: Text('$v'), onPressed: () => setState(() => _amount.text = '$v')),
          ]),
          const SizedBox(height: 18),
          MenuTile(icon: Icons.smartphone, title: 'Mobile Money', subtitle: 'Choisis ton pays et ton opérateur sur la page de paiement sécurisée', onTap: () => _pay('mobile_money')),
          const SizedBox(height: 10),
          MenuTile(icon: Icons.credit_card, title: 'Visa / Mastercard', subtitle: 'Paiement sécurisé via Stripe', onTap: () => _pay('card')),
          const SizedBox(height: 10),
          MenuTile(icon: Icons.currency_bitcoin, title: 'Crypto', subtitle: 'USDT TRC20, BEP20, ERC20, TON, APT', onTap: () {
            if (_value < 100) return showSnack(context, 'Le montant minimum est de 100 FCFA.');
            Navigator.push(context, MaterialPageRoute(builder: (_) => CryptoFlowScreen(topupAmount: _value)));
          }),
          if (_busy) const LoadingView(),
        ]),
      ),
    );
  }
}

/// Waits for the top-up to be confirmed (deep link astral4gamer://wallet or manual return).
class WalletTopupPendingScreen extends StatefulWidget {
  const WalletTopupPendingScreen({super.key, required this.reference});
  final String reference;
  @override
  State<WalletTopupPendingScreen> createState() => _WalletTopupPendingScreenState();
}

class _WalletTopupPendingScreenState extends State<WalletTopupPendingScreen> {
  Map<String, dynamic>? _s;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _check());
    _poll = Timer.periodic(const Duration(seconds: 6), (_) => _check());
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _check() async {
    try {
      final res = await AppScope.read(context).api.get('/api/payments/wallet/topups/${widget.reference}');
      if (!mounted) return;
      setState(() => _s = asMap(res));
      if (['success', 'failed', 'cancelled'].contains(_s!.str('status'))) {
        _poll?.cancel();
        AppScope.read(context).refreshSummary();
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final st = _s?.str('status') ?? 'pending';
    final ok = st == 'success';
    final ko = st == 'failed' || st == 'cancelled';
    return Scaffold(
      appBar: AppBar(title: const Text('Recharge du wallet')),
      body: ListView(padding: const EdgeInsets.all(12), children: [
        A4Card(
          padding: const EdgeInsets.fromLTRB(16, 22, 16, 22),
          child: Column(children: [
            Container(
              width: 66,
              height: 66,
              decoration: BoxDecoration(color: ok ? AppColors.greenSoft : ko ? AppColors.redSoft : const Color(0xFFE8EEFB), shape: BoxShape.circle),
              child: Icon(ok ? Icons.check : ko ? Icons.close : Icons.schedule, color: ok ? AppColors.green : ko ? AppColors.red : AppColors.blue, size: 34),
            ),
            const SizedBox(height: 14),
            Text(ok ? 'Wallet rechargé' : ko ? 'Recharge échouée' : 'Paiement en attente', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.slate)),
            const SizedBox(height: 8),
            if (_s != null) Text('Solde : ${AppScope.of(context).money(_s!.number('wallet_balance'))}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.slate)),
          ]),
        ),
        if (!ok && !ko)
          const Padding(
            padding: EdgeInsets.only(top: 18),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.red)),
              SizedBox(width: 14),
              Text('Mise à jour automatique...', style: TextStyle(fontSize: 16, color: AppColors.slate)),
            ]),
          ),
        const SizedBox(height: 20),
        OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Retour')),
      ]),
    );
  }
}
