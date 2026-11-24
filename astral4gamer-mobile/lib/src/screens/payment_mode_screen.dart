import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/cart_item.dart';
import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/ui.dart';
import 'crypto_flow_screen.dart';
import 'order_tracking_screen.dart';
import 'product_detail_screen.dart';

/// Customer details collected for every payment (pre-filled from the account).
class PaymentCustomer {
  PaymentCustomer(this.email, this.firstName, this.lastName, this.phone);
  final String email, firstName, lastName, phone;
  Map<String, dynamic> toJson(String language, [String? country]) => {
        'email': email,
        'first_name': firstName,
        'last_name': lastName,
        if (phone.isNotEmpty) 'phone': phone,
        if (country != null) 'country': country,
        'language': language,
      };
}

/// "Mode de paiement": amount, customer details, Visa/Mastercard, Mobile Money, Wallet, Crypto.
/// Either [order] (already created) or [items] from the cart (the first line is ordered now).
class PaymentModeScreen extends StatefulWidget {
  const PaymentModeScreen({super.key, this.order, this.items, this.fromCart = false});
  final Map<String, dynamic>? order;
  final List<CartItem>? items;
  final bool fromCart;

  @override
  State<PaymentModeScreen> createState() => _PaymentModeScreenState();
}

class _PaymentModeScreenState extends State<PaymentModeScreen> {
  Map<String, dynamic>? _order;
  Map<String, dynamic>? _funding;
  bool _busy = false;
  late final TextEditingController _email, _first, _last, _phone;

  @override
  void initState() {
    super.initState();
    final state = AppScope.read(context);
    final u = state.user ?? const <String, dynamic>{};
    final parts = state.displayName.trim().split(RegExp(r'\s+'));
    _email = TextEditingController(text: u.str('email'));
    _first = TextEditingController(text: parts.isNotEmpty ? parts.first : '');
    _last = TextEditingController(text: parts.length > 1 ? parts.sublist(1).join(' ') : '');
    _phone = TextEditingController(text: u.str('phone'));
    _order = widget.order;
    WidgetsBinding.instance.addPostFrameCallback((_) => _prepare());
  }

  @override
  void dispose() {
    for (final c in [_email, _first, _last, _phone]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _prepare() async {
    if (_order == null && widget.items != null && widget.items!.isNotEmpty) {
      if (!await requireLogin(context, message: 'Pour continuer le paiement, tu dois créer un compte ou te connecter. Tu vas être redirigé vers l’espace sécurisé.')) {
        if (mounted) Navigator.pop(context);
        return;
      }
      if (!mounted) return;
      setState(() => _busy = true);
      final item = widget.items!.first;
      final order = await createOrder(context, item);
      if (!mounted) return;
      setState(() => _busy = false);
      if (order == null) return Navigator.pop(context);
      AppScope.read(context).removeFromCart(item);
      setState(() => _order = order);
    }
    if (_order == null) return;
    try {
      final f = await AppScope.read(context).api.get('/api/payments/orders/${_order!.str('id')}/funding-options');
      if (mounted) setState(() => _funding = asMap(f));
    } catch (_) {}
  }

  num get _amount => _order?.number('amount') ?? 0;
  String get _orderId => _order?.str('id') ?? '';

  PaymentCustomer? _customer() {
    if (!_email.text.contains('@') || _first.text.trim().isEmpty || _last.text.trim().isEmpty) {
      showSnack(context, 'Renseigne ton e-mail, ton prénom et ton nom.');
      return null;
    }
    return PaymentCustomer(_email.text.trim(), _first.text.trim(), _last.text.trim(), _phone.text.trim());
  }

  Future<void> _initiate(List<String> methods, {String? option, String? quote, String? country}) async {
    final c = _customer();
    if (c == null) return;
    final state = AppScope.read(context);
    setState(() => _busy = true);
    try {
      final res = await state.api.post('/api/payments/initiate', {
        'order_id': int.tryParse(_orderId) ?? _orderId,
        'provider': 'router',
        'methods': methods,
        'customer': c.toJson(state.language, country),
        if (option != null) 'payment_option': option,
        if (quote != null) 'payment_quote': quote,
        'mobile': true,
      });
      final url = res is Map ? '${res['checkout_url'] ?? ''}' : '';
      if (url.isEmpty || url == 'null') throw ApiException('Impossible d’ouvrir le paiement.');
      final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      if (!ok) throw ApiException('Impossible d’ouvrir le paiement.');
      if (mounted) _openTracking();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _openTracking() => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: _orderId, initial: {'id': _orderId, 'amount': _amount, 'currency': 'XOF', 'status': 'payment_pending', 'productName': _order?.obj('metadata').str('variation_name') ?? ''})));

  Future<void> _mobileMoney() async {
    final c = _customer();
    if (c == null) return;
    setState(() => _busy = true);
    Map<String, dynamic> mm;
    try {
      mm = asMap(await AppScope.read(context).api.get('/api/payments/orders/$_orderId/options', query: {'language': AppScope.read(context).language})).obj('mobile_money');
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
      return;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    final countries = mm.list('countries');
    if (!mounted) return;
    if (countries.isEmpty) return _initiate(['mobile_money']);
    final choice = await showModalBottomSheet<(Map<String, dynamic>, Map<String, dynamic>)>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: const Color(0xFFFFF1F0),
      builder: (_) => _MobileMoneySheet(countries: countries, defaultCountry: mm.strOrNull('default_country')),
    );
    if (choice == null || !mounted) return;
    final (country, option) = choice;
    if (option.str('source') == 'pawapay') {
      final prefix = country.str('phone_prefix');
      final digits = _phone.text.replaceAll(RegExp(r'\D'), '');
      if (digits.isEmpty) return showSnack(context, 'Entre ton numéro Mobile Money (Téléphone) avant de continuer.');
      if (prefix.isNotEmpty && !digits.startsWith(prefix)) _phone.text = '$prefix${digits.replaceFirst(RegExp(r'^0+'), '')}';
    }
    await _initiate(['mobile_money'], option: option.str('id'), quote: option.strOrNull('quote'), country: country.str('code'));
  }

  Future<void> _wallet() async {
    setState(() => _busy = true);
    try {
      await AppScope.read(context).api.post('/api/payments/wallet', {'order_id': int.tryParse(_orderId) ?? _orderId, 'source': 'wallet'});
      await AppScope.read(context).refreshSummary();
      if (mounted) _openTracking();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final wallet = _funding?.obj('wallet') ?? const <String, dynamic>{};
    return Scaffold(
      appBar: AppBar(title: const Text('Mode de paiement')),
      body: _order == null
          ? const LoadingView()
          : AbsorbPointer(
              absorbing: _busy,
              child: ListView(padding: const EdgeInsets.fromLTRB(12, 4, 12, 24), children: [
                Text(state.money(_amount), style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w900, color: AppColors.ink)),
                const SizedBox(height: 6),
                const Text('Choisissez comment vous voulez payer votre commande.', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.slate)),
                const SizedBox(height: 16),
                A4Card(
                  padding: const EdgeInsets.fromLTRB(10, 16, 10, 10),
                  child: Column(children: [
                    _field(_email, 'Email', TextInputType.emailAddress),
                    const SizedBox(height: 8),
                    Row(children: [
                      Expanded(child: _field(_first, 'Prénom', TextInputType.name)),
                      const SizedBox(width: 8),
                      Expanded(child: _field(_last, 'Nom', TextInputType.name)),
                    ]),
                    const SizedBox(height: 8),
                    _field(_phone, 'Téléphone', TextInputType.phone),
                  ]),
                ),
                const SizedBox(height: 14),
                _option(Icons.credit_card, 'Visa / Mastercard', 'Paiement sécurisé via Stripe', () => _initiate(['card'], option: 'stripe:card')),
                const SizedBox(height: 10),
                _option(Icons.smartphone, 'Mobile Money', 'Choisis ton pays et ton opérateur sur la page de paiement sécurisée', _mobileMoney),
                if (wallet.flag('can_pay')) ...[
                  const SizedBox(height: 10),
                  _option(Icons.account_balance_wallet_outlined, 'Wallet Astral', 'Solde : ${state.money(wallet.number('balance'))}', _wallet),
                ],
                const SizedBox(height: 10),
                _option(Icons.currency_bitcoin, 'Crypto', 'USDT TRC20, BEP20, ERC20, TON, APT', () {
                  if (_customer() == null) return;
                  Navigator.push(context, MaterialPageRoute(builder: (_) => CryptoFlowScreen(orderId: _orderId, amount: _amount)));
                }),
                if (_busy) const Padding(padding: EdgeInsets.only(top: 20), child: LoadingView()),
              ]),
            ),
    );
  }

  Widget _field(TextEditingController c, String label, TextInputType type) => TextField(
        controller: c,
        keyboardType: type,
        decoration: InputDecoration(labelText: label, labelStyle: const TextStyle(fontSize: 17), floatingLabelStyle: const TextStyle(color: AppColors.text)),
        style: const TextStyle(fontSize: 17),
      );

  Widget _option(IconData icon, String title, String subtitle, VoidCallback onTap) => A4Card(
        onTap: onTap,
        padding: const EdgeInsets.fromLTRB(12, 14, 14, 14),
        child: Row(children: [
          Container(width: 54, height: 54, decoration: BoxDecoration(color: AppColors.redSoft, borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: AppColors.red, size: 28)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.text)),
              const SizedBox(height: 3),
              Text(subtitle, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFF5A4644))),
            ]),
          ),
          const Icon(Icons.chevron_right, color: Color(0xFF4A4040), size: 26),
        ]),
      );
}

/// Country, then operator when the country offers several (pawaPay).
class _MobileMoneySheet extends StatefulWidget {
  const _MobileMoneySheet({required this.countries, this.defaultCountry});
  final List<Map<String, dynamic>> countries;
  final String? defaultCountry;
  @override
  State<_MobileMoneySheet> createState() => _MobileMoneySheetState();
}

class _MobileMoneySheetState extends State<_MobileMoneySheet> {
  Map<String, dynamic>? _country;

  @override
  Widget build(BuildContext context) {
    final countries = [...widget.countries]..sort((a, b) => (a.str('code') == widget.defaultCountry ? 0 : 1).compareTo(b.str('code') == widget.defaultCountry ? 0 : 1));
    final c = _country;
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * .75),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
            Text(c == null ? 'Choisis ton pays' : 'Choisis ton opérateur', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.ink)),
            const SizedBox(height: 12),
            Flexible(
              child: ListView(shrinkWrap: true, children: [
                if (c == null)
                  for (final k in countries)
                    _tile(k.strOrNull('flag_url'), k.str('name'), null, () {
                      final opts = k.list('options');
                      if (opts.length == 1) {
                        Navigator.pop(context, (k, opts.first));
                      } else {
                        setState(() => _country = k);
                      }
                    })
                else
                  for (final o in c.list('options'))
                    _tile(o.strOrNull('logo_url'), o.str('name'), AppScope.of(context).money(o.number('amount')), () => Navigator.pop(context, (c, o))),
              ]),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _tile(String? img, String title, String? trailing, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: A4Card(
          onTap: onTap,
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
          child: Row(children: [
            if (img != null) ClipRRect(borderRadius: BorderRadius.circular(4), child: Image.network(img, width: 32, height: 22, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox(width: 32))) else const Icon(Icons.smartphone, color: AppColors.red),
            const SizedBox(width: 14),
            Expanded(child: Text(title, style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w700, color: AppColors.text))),
            if (trailing != null) Text(trailing, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate)),
            const Icon(Icons.chevron_right),
          ]),
        ),
      );
}
