import 'package:flutter/material.dart';

import '../models/cart_item.dart';
import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../services/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/ui.dart';
import 'app_shell.dart';
import 'payment_mode_screen.dart';

/// Creates the order (POST orders) for a cart line; returns the raw order, or null after showing the error.
Future<Map<String, dynamic>?> createOrder(BuildContext context, CartItem item) async {
  final state = AppScope.read(context);
  final uid = item.fields['player_id'] ?? item.fields['user_id'] ?? item.fields.values.firstWhere((v) => v.isNotEmpty, orElse: () => '');
  final nickname = item.fields['_nickname'];
  final supplierFields = Map<String, String>.from(item.fields)..remove('_nickname');
  try {
    final res = await state.api.post('/api/orders', {
      'product_id': int.tryParse(item.productId) ?? item.productId,
      if (item.variationId.isNotEmpty) 'variation_id': item.variationId,
      'game_uid': uid.isEmpty ? '-' : uid,
      'nickname': (nickname == null || nickname.isEmpty) ? (uid.isEmpty ? state.displayName : uid) : nickname,
      'quantity': item.quantity,
      if (supplierFields.isNotEmpty) 'supplier_fields': supplierFields,
    });
    return asMap(res);
  } on ApiException catch (e) {
    if (context.mounted) showSnack(context, e.message);
    return null;
  }
}

/// Asks a guest to log in before paying. Returns true when the user is (now) logged in.
Future<bool> requireLogin(BuildContext context, {String message = 'Pour acheter ce produit, crée un compte ou connecte-toi. Tu vas être redirigé vers l’espace sécurisé.'}) async {
  if (AppScope.read(context).loggedIn) return true;
  final go = await showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Connexion requise'),
      content: Text(message, style: const TextStyle(color: AppColors.slate, fontWeight: FontWeight.w600)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
        FilledButton(style: FilledButton.styleFrom(minimumSize: const Size(120, 44)), onPressed: () => Navigator.pop(context, true), child: const Text('Se connecter')),
      ],
    ),
  );
  if (go == true && context.mounted) {
    Navigator.of(context).popUntil((r) => r.isFirst);
    AppShell.of(context)?.go(4);
  }
  return false;
}

/// "Produit": image, title, description, delivery fields (option, player ID, verify, pseudo), quantity, Total / cart / Payer.
class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.productId, this.initial});
  final String productId;
  final Map<String, dynamic>? initial;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  Map<String, dynamic>? _p;
  String? _error;
  String? _variationId;
  int _qty = 1;
  bool _verifying = false;
  bool _busy = false;
  String? _verifyMsg;
  bool _verified = false;
  final Map<String, TextEditingController> _fields = {};
  final _nickname = TextEditingController();

  @override
  void initState() {
    super.initState();
    _p = widget.initial;
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    for (final c in _fields.values) {
      c.dispose();
    }
    _nickname.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final state = AppScope.read(context);
    try {
      final res = await state.api.get(state.loggedIn ? '/api/user/products/${widget.productId}' : '/api/products/${widget.productId}');
      if (!mounted) return;
      setState(() {
        _p = asMap(res);
        _error = null;
      });
    } on ApiException catch (e) {
      if (mounted && _p == null) setState(() => _error = e.message);
    }
  }

  List<Map<String, dynamic>> get _variations => (_p ?? const {}).list('variations');
  Map<String, dynamic>? get _variation {
    for (final v in _variations) {
      if (v.str('variation_id') == _variationId) return v;
    }
    return null;
  }

  List<Map<String, dynamic>> get _requiredFields {
    final p = _p ?? const <String, dynamic>{};
    final f = p.list('required_fields');
    if (f.isEmpty && p.flag('requires_uid')) return const [{'key': 'player_id', 'label': 'Player ID'}];
    return f;
  }

  bool get _topUp => (_p ?? const {}).str('type') == 'top-up';
  num get _unitPrice => _variation?.number('price') ?? (_p ?? const {}).number('price');

  TextEditingController _ctrl(String key) => _fields.putIfAbsent(key, () => TextEditingController());

  Future<void> _verify() async {
    final uid = _ctrl(_requiredFields.first.str('key')).text.trim();
    if (uid.isEmpty) return setState(() => _verifyMsg = 'Entre d’abord ton ID joueur.');
    setState(() {
      _verifying = true;
      _verifyMsg = null;
    });
    try {
      final res = await AppScope.read(context).api.post('/api/player/verify', {
        'game': (_p ?? const {}).str('game', (_p ?? const {}).str('name')),
        'uid': uid,
        if (_variationId != null) 'variation_id': _variationId,
        'fields': {for (final e in _fields.entries) e.key: e.value.text.trim()},
      });
      final m = asMap(res);
      setState(() {
        _verified = m.flag('verified', true);
        final nick = m.strOrNull('nickname');
        if (nick != null && nick != uid) _nickname.text = nick;
        _verifyMsg = _verified ? 'ID vérifié' : 'ID introuvable';
      });
    } on ApiException catch (e) {
      setState(() {
        _verified = false;
        _verifyMsg = e.status == 503 ? 'ID temporairement indisponible' : e.message;
      });
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  CartItem? _item() {
    final p = _p;
    if (p == null) return null;
    if (_variations.isNotEmpty && _variation == null) {
      showSnack(context, 'Choisis d’abord une option.');
      return null;
    }
    final values = <String, String>{};
    for (final f in _requiredFields) {
      final v = _ctrl(f.str('key')).text.trim();
      if (v.isEmpty) {
        showSnack(context, 'Renseigne le champ « ${f.str('label', f.str('key'))} ».');
        return null;
      }
      values[f.str('key')] = v;
    }
    if (_nickname.text.trim().isNotEmpty) values['_nickname'] = _nickname.text.trim();
    return CartItem(
      productId: p.str('id'),
      productName: p.str('name'),
      variationId: _variationId ?? p.str('variation_id'),
      variationName: _variation?.str('name') ?? p.str('name'),
      unitPrice: _unitPrice,
      currency: p.str('currency', 'XOF'),
      imageUrl: p.strOrNull('image_url'),
      quantity: _qty,
      fields: values,
    );
  }

  Future<void> _pay() async {
    final item = _item();
    if (item == null) return;
    if (!await requireLogin(context)) return;
    if (!mounted) return;
    setState(() => _busy = true);
    final order = await createOrder(context, item);
    if (mounted) setState(() => _busy = false);
    if (order == null || !mounted) return;
    Navigator.push(context, MaterialPageRoute(builder: (_) => PaymentModeScreen(order: order)));
  }

  void _addToCart() {
    final item = _item();
    if (item == null) return;
    AppScope.read(context).addToCart(item);
    showSnack(context, 'Ajouté au panier');
  }

  @override
  Widget build(BuildContext context) {
    final p = _p;
    final state = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Produit')),
      body: p == null
          ? (_error != null ? ErrorView(message: _error!, onRetry: _load) : const LoadingView())
          : ListView(padding: const EdgeInsets.fromLTRB(12, 6, 12, 24), children: _content(p, state)),
      bottomNavigationBar: p == null
          ? null
          : Container(
              padding: EdgeInsets.fromLTRB(12, 10, 12, 10 + MediaQuery.of(context).padding.bottom),
              decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Color(0xFFEDEFF3)))),
              child: Row(children: [
                Expanded(
                  child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Total', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.slate)),
                    Text(state.money(_unitPrice * _qty), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.red)),
                  ]),
                ),
                InkWell(
                  onTap: _busy ? null : _addToCart,
                  customBorder: const CircleBorder(),
                  child: Container(width: 52, height: 52, decoration: const BoxDecoration(color: Color(0xFFFDDCDA), shape: BoxShape.circle), child: const Icon(Icons.add_shopping_cart, color: AppColors.ink)),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  width: 130 + 0.0,
                  child: FilledButton(
                    onPressed: _busy ? null : _pay,
                    child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Payer'),
                  ),
                ),
              ]),
            ),
    );
  }

  List<Widget> _content(Map<String, dynamic> p, AppState state) {
    final img = p.strOrNull('image_url');
    final description = (p.strOrNull('description_${state.language}') ?? p.strOrNull('description') ?? '').replaceAll(r'\n', '\n');
    final instant = p.str('delivery') == 'automatic';
    return [
      ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: AspectRatio(
          aspectRatio: 1.6,
          child: img == null ? Container(color: AppColors.blueSoft) : Image.network(img, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: AppColors.blueSoft)),
        ),
      ),
      const SizedBox(height: 14),
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Text(p.strOrNull('name_${state.language}') ?? p.str('name'), style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.ink))),
        if (instant)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(color: AppColors.greenSoft, borderRadius: BorderRadius.circular(8)),
            child: const Text('Instant', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.green)),
          ),
      ]),
      const SizedBox(height: 10),
      Text(p.str('game', p.str('category')), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.slate)),
      if (description.isNotEmpty) ...[
        const SizedBox(height: 10),
        Text(description, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600, color: AppColors.slate, height: 1.4)),
      ],
      if ((p.obj('promotion').flag('active'))) ...[
        const SizedBox(height: 10),
        StatusPill(label: '${p.obj('promotion').str('label', 'Promotion')} · -${p.obj('promotion').number('discount_percent').round()}%', color: AppColors.red, background: AppColors.redSoft),
      ],
      const SizedBox(height: 16),
      A4Card(
        padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Informations de livraison', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.slate)),
          const SizedBox(height: 14),
          if (_variations.isNotEmpty) ...[
            DropdownButtonFormField<String>(
              initialValue: _variationId,
              isExpanded: true,
              hint: const Text('Option', style: TextStyle(fontSize: 17, color: AppColors.text)),
              decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16)),
              items: [
                for (final v in _variations)
                  DropdownMenuItem(
                    value: v.str('variation_id'),
                    enabled: v.flag('available', true),
                    child: Text(
                      '${v.str('name')} - ${v.flag('available', true) ? state.money(v.number('price')) : 'Indisponible'}',
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: v.flag('available', true) ? AppColors.text : AppColors.muted),
                    ),
                  ),
              ],
              onChanged: (v) => setState(() {
                _variationId = v;
                _verified = false;
                _verifyMsg = null;
              }),
            ),
            const SizedBox(height: 10),
          ],
          for (final f in _requiredFields) ...[
            TextField(
              controller: _ctrl(f.str('key')),
              keyboardType: f.str('key').contains('id') ? TextInputType.number : TextInputType.text,
              onChanged: (_) => setState(() => _verified = false),
              decoration: InputDecoration(hintText: f.str('label', f.str('key')), hintStyle: const TextStyle(fontSize: 17, color: AppColors.text)),
            ),
            const SizedBox(height: 10),
          ],
          if (p.flag('requires_uid')) ...[
            OutlinedButton.icon(
              onPressed: _verifying ? null : _verify,
              icon: _verifying ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.red)) : const Icon(Icons.manage_search),
              label: const Text('Vérifier l’ID'),
            ),
            if (_verifyMsg != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(_verifyMsg!, style: TextStyle(fontWeight: FontWeight.w700, color: _verified ? AppColors.green : AppColors.red)),
              ),
            const SizedBox(height: 10),
            TextField(controller: _nickname, decoration: const InputDecoration(hintText: 'Pseudo du joueur', hintStyle: TextStyle(fontSize: 17, color: AppColors.text), prefixIcon: Icon(Icons.badge_outlined))),
          ],
          const SizedBox(height: 18),
          Row(children: [
            const Expanded(child: Text('Quantité', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.slate))),
            _round(Icons.remove, _qty > 1 ? () => setState(() => _qty--) : null, grey: true),
            Padding(padding: const EdgeInsets.symmetric(horizontal: 14), child: Text('$_qty', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.slate))),
            _round(Icons.add, _topUp ? null : () => setState(() => _qty = (_qty + 1).clamp(1, 99))),
          ]),
        ]),
      ),
    ];
  }

  Widget _round(IconData icon, VoidCallback? onTap, {bool grey = false}) => InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(color: grey ? const Color(0xFFE2E2E2) : const Color(0xFFFDDCDA), shape: BoxShape.circle),
          child: Icon(icon, color: onTap == null ? AppColors.muted : AppColors.ink),
        ),
      );
}
