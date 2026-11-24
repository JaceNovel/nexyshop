import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/ui.dart';

/// "Redeem code": Free Fire 110 diamonds promotion (8-digit code + Free Fire ID).
class RedeemCodeScreen extends StatefulWidget {
  const RedeemCodeScreen({super.key});
  @override
  State<RedeemCodeScreen> createState() => _RedeemCodeScreenState();
}

class _RedeemCodeScreenState extends State<RedeemCodeScreen> {
  Map<String, dynamic>? _promo;
  final _code = TextEditingController();
  final _uid = TextEditingController();
  bool _busy = false;
  String? _error;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    final state = AppScope.read(context);
    _uid.text = state.user?.strOrNull('player_uid') ?? '';
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _poll?.cancel();
    _code.dispose();
    _uid.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final res = asMap(await AppScope.read(context).api.get('/api/promotions/free-fire-110'));
      if (!mounted) return;
      setState(() => _promo = res);
      final processing = res.obj('claim').str('status') == 'processing';
      if (processing && _poll == null) _poll = Timer.periodic(const Duration(seconds: 8), (_) => _load());
      if (!processing) _poll?.cancel();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _redeem() async {
    final code = _code.text.trim();
    if (!RegExp(r'^\d{8}$').hasMatch(code)) return setState(() => _error = 'Entre un code valide de 8 chiffres.');
    if (!RegExp(r'^\d{6,20}$').hasMatch(_uid.text.trim())) return setState(() => _error = 'Entre ton ID joueur.');
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = asMap(await AppScope.read(context).api.post('/api/promotions/free-fire-110/redeem', {'code': code, 'player_uid': _uid.text.trim()}));
      setState(() => _promo = res);
      _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _promo;
    final claim = p?.obj('claim') ?? const <String, dynamic>{};
    return Scaffold(
      appBar: AppBar(title: const Text('Redeem code')),
      body: ListView(padding: const EdgeInsets.fromLTRB(12, 12, 12, 24), children: [
        A4Card(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.confirmation_number_outlined, color: AppColors.red, size: 34),
            const SizedBox(height: 10),
            Text('${p?.integer('reward_diamonds', 110) ?? 110} diamants Free Fire offerts', style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: AppColors.slate)),
            const SizedBox(height: 6),
            Text(p == null ? 'Chargement…' : (p.strOrNull('message') ?? (p.flag('enabled') ? 'Entre ton code à 8 chiffres et ton ID Free Fire.' : 'Campagne indisponible')), style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
            if (p != null && p.flag('enabled')) ...[
              const SizedBox(height: 6),
              Text('${p.integer('remaining')} crédit(s) restant(s)', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.red)),
            ],
          ]),
        ),
        const SizedBox(height: 12),
        if (claim.isNotEmpty)
          A4Card(
            color: claim.str('status') == 'delivered' ? const Color(0xFFEFFAF4) : null,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(claim.str('status') == 'delivered' ? 'Diamants livrés' : 'Crédit en cours de traitement', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.slate)),
              const SizedBox(height: 6),
              Text('ID ${claim.str('player_uid')} · ${claim.str('nickname')}', style: const TextStyle(color: AppColors.slate, fontWeight: FontWeight.w600)),
              if (claim.strOrNull('message') != null) Text(claim.str('message'), style: const TextStyle(color: AppColors.slate)),
            ]),
          )
        else ...[
          TextField(controller: _code, keyboardType: TextInputType.number, maxLength: 8, decoration: const InputDecoration(hintText: 'Code à 8 chiffres', prefixIcon: Icon(Icons.password))),
          const SizedBox(height: 4),
          TextField(controller: _uid, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'ID Free Fire', prefixIcon: Icon(Icons.badge_outlined))),
          if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: AppColors.red, fontWeight: FontWeight.w700))),
          const SizedBox(height: 14),
          FilledButton(onPressed: _busy || (p != null && !p.flag('enabled')) ? null : _redeem, child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Valider le code')),
        ],
        const SizedBox(height: 10),
        const Text('Régions prises en charge : BR, CIS, EU, LATAM, MENA.', style: TextStyle(fontSize: 13, color: AppColors.muted)),
      ]),
    );
  }
}
