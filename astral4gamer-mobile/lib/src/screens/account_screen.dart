import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/astral_auth_form.dart';
import '../widgets/ui.dart';
import 'account_destinations.dart';
import 'order_tracking_screen.dart';

/// "Compte" tab: profile, orders count and VIP level, Free Fire profile, recent orders, "Mon espace".
class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  List<Map<String, dynamic>> _orders = const [];
  Map<String, dynamic>? _ff;
  bool _ffError = false;
  String? _loadedFor;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final state = AppScope.of(context);
    final key = state.loggedIn ? state.api.token : null;
    if (key != _loadedFor) {
      _loadedFor = key;
      if (key != null) _load();
    }
  }

  Future<void> _load() async {
    final state = AppScope.read(context);
    await state.refreshSummary();
    try {
      final list = asList(await state.api.get('/api/orders'));
      if (mounted) setState(() => _orders = list.take(5).toList());
    } catch (_) {}
    final u = state.user;
    final uid = playerUid(u);
    if (uid != null && (u?.str('game') ?? 'free_fire') == 'free_fire') {
      try {
        final p = await state.api.post('/api/freefire/profile', {'uid': uid, 'region': u?.strOrNull('free_fire_region') ?? 'me'});
        if (mounted) setState(() => _ff = asMap(p));
      } catch (_) {
        if (mounted) setState(() => _ffError = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final u = state.user ?? const <String, dynamic>{};
    return Scaffold(
      appBar: AppBar(title: const Text('Compte')),
      body: RefreshIndicator(
        color: AppColors.red,
        onRefresh: () async {
          await state.refreshUser();
          await _load();
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(12, 16, 12, 40),
          children: [
            _profileCard(state, u),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _stat(Icons.receipt_long_outlined, state.loggedIn ? '${state.ordersCount}' : '0', 'Commandes')),
              const SizedBox(width: 10),
              Expanded(child: _stat(Icons.workspace_premium_outlined, state.loggedIn ? (state.vipLevel.isEmpty ? 'Bronze' : state.vipLevel) : 'Invité', 'Niveau VIP')),
            ]),
            const SizedBox(height: 14),
            if (!state.loggedIn) const AstralAuthForm() else ...[
              _sessionCard(state),
              if (_ff != null || _ffError) ...[const SizedBox(height: 14), _freeFireCard()],
              if (_orders.isNotEmpty) ...[const SizedBox(height: 14), _recentOrders()],
            ],
            const SectionTitle('Mon espace'),
            ...accountDestinations(context, state).expand((w) => [w, const SizedBox(height: 10)]),
          ],
        ),
      ),
    );
  }

  Widget _profileCard(dynamic state, Map<String, dynamic> u) {
    final logged = state.loggedIn as bool;
    final uid = playerUid(u);
    final game = gameLabel(u.strOrNull('game'));
    return A4Card(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      child: Row(children: [
        logged
            ? UserAvatar(url: u.strOrNull('avatar_url') ?? u.strOrNull('google_avatar_url'), size: 84)
            : Container(width: 84, height: 84, decoration: const BoxDecoration(color: AppColors.redSoft, shape: BoxShape.circle), child: const Icon(Icons.person, color: AppColors.red, size: 36)),
        const SizedBox(width: 18),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(logged ? state.displayName as String : 'Invité Astral', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.slate)),
            const SizedBox(height: 6),
            Text(logged ? u.str('email') : 'Connectez-vous pour retrouver vos commandes.', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.slate)),
            if (logged && uid != null) ...[
              const SizedBox(height: 4),
              Text('ID joueur : $uid', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.blue)),
            ],
            if (logged && game != null) ...[
              const SizedBox(height: 4),
              Text(game, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
            ],
            const SizedBox(height: 8),
            Text(logged ? 'Compte connecté' : 'Session invitée', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: logged ? AppColors.green : AppColors.slate)),
          ]),
        ),
      ]),
    );
  }

  Widget _stat(IconData icon, String value, String label) => A4Card(
        padding: const EdgeInsets.fromLTRB(10, 14, 10, 12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: AppColors.red, size: 26),
          const SizedBox(height: 12),
          Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.slate)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.slate)),
        ]),
      );

  Widget _sessionCard(dynamic state) => A4Card(
        padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Session active', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.slate)),
          const SizedBox(height: 8),
          const Text('Compte Astral4Gamer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.slate)),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(minimumSize: const Size(110, 48), padding: const EdgeInsets.symmetric(horizontal: 26)),
            onPressed: () async {
              await state.logout();
              setState(() {
                _orders = const [];
                _ff = null;
              });
            },
            icon: const Icon(Icons.logout),
            label: const Text('Se déconnecter'),
          ),
        ]),
      );

  Widget _freeFireCard() {
    final p = _ff ?? const <String, dynamic>{};
    String v(List<String> keys) {
      for (final k in keys) {
        final s = p.strOrNull(k) ?? p.obj('rank').strOrNull(k) ?? p.obj('guild').strOrNull(k) ?? p.obj('stats').strOrNull(k);
        if (s != null && !s.startsWith('{') && !s.startsWith('[')) return s;
      }
      return 'Non fourni';
    }

    String rank(String k) {
      final r = p.obj('rank')[k];
      if (r is Map) return '${r['name'] ?? r['tier'] ?? r['label'] ?? 'Non fourni'}';
      return r == null ? 'Non fourni' : '$r';
    }

    final tiles = [
      (Icons.trending_up, 'NIVEAU', v(['level'])),
      (Icons.favorite_border, 'LIKES', v(['likes'])),
      (Icons.military_tech_outlined, 'RANG BR', rank('br')),
      (Icons.stars_outlined, 'POINTS BR', v(['br_rank_points'])),
      (Icons.shield_outlined, 'RANG CS', rank('cs')),
      (Icons.bolt, 'POINTS CS', v(['cs_rank_points'])),
      (Icons.sports_esports_outlined, 'MATCHS', v(['matches', 'games_played', 'match_points_br'])),
      (Icons.emoji_events_outlined, 'VICTOIRES', v(['wins', 'booyah'])),
      (Icons.gps_fixed, 'ÉLIMINATIONS', v(['kills'])),
      (Icons.groups_outlined, 'GUILDE', v(['GuildName'])),
      (Icons.public, 'RÉGION', v(['region']).toUpperCase()),
    ];
    final nick = v(['nickname', 'name', 'pseudo']);
    return A4Card(
      padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 52, height: 52, decoration: BoxDecoration(color: AppColors.redSoft, borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.sports_esports, color: AppColors.red)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Profil Free Fire', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.slate)),
              Text(nick == 'Non fourni' ? '' : nick, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.slate)),
            ]),
          ),
        ]),
        if (_ffError && _ff == null)
          const Padding(padding: EdgeInsets.only(top: 12), child: Text('Certaines données du profil n’ont pas pu être chargées.', style: TextStyle(color: AppColors.slate)))
        else ...[
          const SizedBox(height: 14),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 2.9,
            children: [
              for (final t in tiles)
                Container(
                  padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
                  decoration: BoxDecoration(color: const Color(0xFFF7F9FC), borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                    Row(children: [
                      Icon(t.$1, size: 15, color: AppColors.red),
                      const SizedBox(width: 6),
                      Text(t.$2, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: AppColors.slate, letterSpacing: .4)),
                    ]),
                    const SizedBox(height: 6),
                    Text(t.$3, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.slate, letterSpacing: t.$2 == 'GUILDE' ? 1 : 0)),
                  ]),
                ),
            ],
          ),
        ],
      ]),
    );
  }

  Widget _recentOrders() => A4Card(
        padding: const EdgeInsets.fromLTRB(12, 14, 12, 8),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Commandes récentes', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.slate)),
          const SizedBox(height: 6),
          for (final o in _orders)
            InkWell(
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: o.str('id'), initial: o))),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(children: [
                  const Icon(Icons.receipt_long_outlined, color: AppColors.red, size: 26),
                  const SizedBox(width: 22),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Commande #${o.str('id')}', style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: AppColors.text)),
                      const SizedBox(height: 3),
                      Text('${formatMoney(o.number('amount'), o.str('currency', 'XOF'))} - ${o.str('status')}',style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w500, color: Color(0xFF4A4040))),
                    ]),
                  ),
                ]),
              ),
            ),
        ]),
      );
}

String? playerUid(Map<String, dynamic>? u) {
  if (u == null) return null;
  return u.strOrNull('player_uid') ?? u.strOrNull('player_id') ?? u.strOrNull('game_uid');
}

String? gameLabel(String? game) {
  if (game == null || game.isEmpty) return null;
  const labels = {'free_fire': 'Free Fire', 'freefire': 'Free Fire', 'pubg': 'PUBG Mobile', 'codm': 'Call of Duty Mobile', 'mlbb': 'Mobile Legends'};
  return labels[game.toLowerCase()] ?? game.replaceAll('_', ' ');
}
