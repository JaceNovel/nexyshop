import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../services/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/ui.dart';
import 'account_screen.dart';
import 'gifts_screen.dart';
import 'order_tracking_screen.dart';
import 'support_screen.dart';
import 'wallet_screen.dart';

/// "Mon espace" entries of the account screen.
List<Widget> accountDestinations(BuildContext context, AppState state) {
  void open(Widget page, {bool auth = true}) {
    if (auth && !state.loggedIn) {
      showSnack(context, 'Connecte-toi pour accéder à cet espace.');
      return;
    }
    Navigator.push(context, MaterialPageRoute(builder: (_) => page));
  }

  return [
    MenuTile(icon: Icons.person_pin_circle_outlined, title: 'Profil public', subtitle: 'Pseudo, jeux favoris et carte joueur', onTap: () => open(const ProfileScreen())),
    MenuTile(icon: Icons.shopping_bag_outlined, iconColor: AppColors.blue, title: 'Achats', subtitle: 'Suivi des commandes, livraisons et paiements', onTap: () => open(const OrdersScreen())),
    MenuTile(icon: Icons.volunteer_activism_outlined, title: 'Mes demandes', subtitle: 'Suivre, modifier ou annuler mes demandes A4G Gifts', onTap: () => open(const MyGiftRequestsScreen())),
    MenuTile(icon: Icons.account_balance_wallet_outlined, iconColor: AppColors.gold, title: 'Wallet', subtitle: '${formatMoney(state.walletBalance)} disponibles', onTap: () => open(const WalletScreen())),
    MenuTile(icon: Icons.redeem_outlined, iconColor: AppColors.green, title: 'Cashback', subtitle: formatMoney(0), onTap: () => open(const CashbackScreen())),
    MenuTile(icon: Icons.support_agent, iconColor: AppColors.ink, title: 'Support', subtitle: 'Assistance, vérification ID et remboursements', onTap: () => open(const SupportScreen(), auth: false)),
    MenuTile(
      icon: Icons.delete_forever_outlined,
      title: 'Supprimer mon compte',
      subtitle: 'Demander la suppression du compte et des données personnelles',
      onTap: () {
        if (!state.loggedIn) return showSnack(context, 'Connecte-toi pour accéder à cet espace.');
        showDialog(context: context, builder: (_) => const DeleteAccountDialog());
      },
    ),
  ];
}

/// "Mon profil": avatar, name and the public profile fields.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final u = state.user ?? const <String, dynamic>{};
    String v(String k) => u.strOrNull(k) ?? 'Non renseigné';
    final rows = [
      ('Email', u.str('email')),
      ('ID joueur', playerUid(u) ?? 'Non renseigné'),
      ('Jeu', v('game')),
      ('Rang', v('rank')),
      ('Pays', v('country')),
      ('Guilde', v('guild')),
      ('Points', u.str('points', '0')),
      ('Victoires', u.str('wins', '0')),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Mon profil')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
        children: [
          Center(child: UserAvatar(url: u.strOrNull('avatar_url') ?? u.strOrNull('google_avatar_url'), size: 62 * 1.0 + 0)),
          const SizedBox(height: 12),
          Center(child: Text(state.displayName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.slate))),
          const SizedBox(height: 22),
          for (final r in rows)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 13),
              child: Row(children: [
                Text(r.$1, style: const TextStyle(fontSize: 17, color: AppColors.text)),
                const Spacer(),
                Flexible(child: Text(r.$2, textAlign: TextAlign.right, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF4A4040)))),
              ]),
            ),
        ],
      ),
    );
  }
}

/// "Mes commandes": every order with its status pill.
class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late Future<List<Map<String, dynamic>>> _f = _load();

  Future<List<Map<String, dynamic>>> _load() async => asList(await AppScope.read(context).api.get('/api/orders', query: {'per_page': 50}));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes commandes')),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _f,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) return const LoadingView();
          if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _f = _load()));
          final orders = snap.data!;
          return RefreshIndicator(
            color: AppColors.red,
            onRefresh: () async => setState(() => _f = _load()),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
              itemCount: orders.isEmpty ? 1 : orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                if (orders.isEmpty) return const InfoCard('Vos commandes créées dans l’application apparaîtront ici.');
                final o = orders[i];
                final pill = orderPill(o.str('status'));
                return A4Card(
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: o.str('id'), initial: o))),
                  padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Icon(Icons.shopping_bag_outlined, color: AppColors.blue, size: 26),
                    const SizedBox(width: 22),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(orderProductName(o), style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: AppColors.text)),
                        const SizedBox(height: 3),
                        Text('${orderReference(o)} · ${formatDate(o.strOrNull('createdAt'))}', style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w500, color: Color(0xFF4A4040))),
                        const SizedBox(height: 2),
                        Text(formatMoney(o.number('amount'), o.str('currency', 'XOF')),style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w500, color: Color(0xFF4A4040))),
                      ]),
                    ),
                    StatusPill(label: pill.$1, color: pill.$2, background: pill.$3),
                  ]),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

String orderReference(Map<String, dynamic> o) => o.strOrNull('reference') ?? 'A4G-${o.str('id').padLeft(6, '0')}';

String orderProductName(Map<String, dynamic> o) => o.strOrNull('productName') ?? o.obj('product').strOrNull('name') ?? 'Commande';

/// Status pill for the normalized order status: label, text colour, background.
(String, Color, Color) orderPill(String status) {
  switch (status) {
    case 'delivered':
      return ('Livrée', AppColors.green, AppColors.greenSoft);
    case 'supplier_submitted':
    case 'manual_processing':
    case 'verification':
      return ('En cours', AppColors.blue, AppColors.blueSoft);
    case 'refunded':
      return ('Remboursée', AppColors.slate, Color(0xFFEFF1F5));
    case 'failed':
      return ('Échouée', AppColors.red, AppColors.redSoft);
    case 'cancelled':
      return ('Annulée', AppColors.slate, Color(0xFFEFF1F5));
    default:
      return ('À payer', AppColors.orange, AppColors.orangeSoft);
  }
}

/// "Cashback & VIP" summary.
class CashbackScreen extends StatefulWidget {
  const CashbackScreen({super.key});
  @override
  State<CashbackScreen> createState() => _CashbackScreenState();
}

class _CashbackScreenState extends State<CashbackScreen> {
  late Future<Map<String, dynamic>> _f = AppScope.read(context).api.get('/api/user/vip').then(asMap);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cashback & VIP')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _f,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) return const LoadingView();
          if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _f = AppScope.read(context).api.get('/api/user/vip').then(asMap)));
          final v = vipView(snap.data!);
          Widget row(IconData i, String label, String value) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: A4Card(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                  child: Row(children: [
                    Icon(i, color: AppColors.red, size: 26),
                    const SizedBox(width: 22),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(label, style: const TextStyle(fontSize: 16.5, color: AppColors.text, letterSpacing: .3)),
                      const SizedBox(height: 4),
                      Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF4A4040))),
                    ]),
                  ]),
                ),
              );
          return ListView(padding: const EdgeInsets.fromLTRB(12, 12, 12, 24), children: [
            row(Icons.redeem_outlined, 'Cashback disponible', formatMoney(v.cashback)),
            row(Icons.workspace_premium_outlined, 'Niveau actuel', v.level),
            row(Icons.shopping_bag_outlined, 'Achats éligibles', '${v.purchases}'),
            row(Icons.trending_up, 'Montant cumulé', formatMoney(v.spent)),
          ]);
        },
      ),
    );
  }
}

class VipView {
  VipView(this.level, this.cashback, this.purchases, this.spent, this.tiers);
  final String level;
  final num cashback;
  final int purchases;
  final num spent;
  final List<Map<String, dynamic>> tiers;
}

/// GET user/vip: {currentLevel, orders, spend (USD), levels[{name,minOrders,minSpend(USD),cashbackPercent,discountPercent}], cashbackBalance}.
VipView vipView(Map<String, dynamic> m) {
  final usd = m.str('spendCurrency', 'USD') == 'USD';
  return VipView(
    m.strOrNull('currentLevel') ?? 'Bronze',
    m.number('cashbackBalance'),
    m.integer('orders'),
    usd ? (m.number('spend') * AppState.xofPerUsd).round() : m.number('spend'),
    m.list('levels'),
  );
}

/// Account deletion request (deleted within 30 days).
class DeleteAccountDialog extends StatefulWidget {
  const DeleteAccountDialog({super.key});
  @override
  State<DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<DeleteAccountDialog> {
  final _reason = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    setState(() => _busy = true);
    final state = AppScope.read(context);
    try {
      await state.api.post('/api/user/account-deletion', {'confirmation': true, 'reason': _reason.text.trim()});
      if (!mounted) return;
      Navigator.pop(context);
      showSnack(context, 'Ta demande de suppression a été enregistrée.');
      await state.logout();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFFFBE4E3),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      title: const Text('Supprimer mon compte', style: TextStyle(fontSize: 24, color: AppColors.ink)),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text(
          'Cette demande supprimera le compte et les données personnelles sous 30 jours. Certaines données de transaction peuvent être conservées lorsque la loi l’impose.',
          style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600, color: AppColors.slate, height: 1.4),
        ),
        const SizedBox(height: 14),
        TextField(controller: _reason, maxLength: 500, minLines: 2, maxLines: 4, decoration: const InputDecoration(hintText: 'Motif (facultatif)', border: OutlineInputBorder(borderSide: BorderSide.none, borderRadius: BorderRadius.all(Radius.circular(12))))),
      ]),
      actionsOverflowDirection: VerticalDirection.down,
      actions: [
        Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Align(alignment: Alignment.centerRight, child: TextButton(onPressed: _busy ? null : () => Navigator.pop(context), child: const Text('Annuler'))),
          const SizedBox(height: 8),
          FilledButton(onPressed: _busy ? null : _confirm, child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Confirmer la suppression')),
        ]),
      ],
    );
  }
}
