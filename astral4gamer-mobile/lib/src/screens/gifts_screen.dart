import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/ui.dart';
import 'payment_mode_screen.dart';
import 'product_detail_screen.dart';

const giftShareBase = 'https://astral4gamer.com/g/';

/// Gift status label for "Mes demandes".
String giftStatusLabel(String s) => const {
      'active': 'Active',
      'funded': 'Financée',
      'delivery_pending': 'Livraison',
      'delivering': 'Livraison',
      'delivered': 'Livrée',
      'cancelled': 'Annulée',
      'refunded': 'Remboursée',
    }[s] ??
    s;

/// Owners followed with the heart (the API has no list endpoint, so they are remembered on the device).
class _Favorites {
  static Future<Set<String>> load() async => ((await SharedPreferences.getInstance()).getStringList('gift_favorites') ?? const []).toSet();
  static Future<void> save(Set<String> ids) async => (await SharedPreferences.getInstance()).setStringList('gift_favorites', ids.toList());
}

/// A4G Gifts tab: greeting, "Comment ça marche ?", open requests with search and favourites.
class GiftsScreen extends StatefulWidget {
  const GiftsScreen({super.key});
  @override
  State<GiftsScreen> createState() => GiftsScreenState();
}

class GiftsScreenState extends State<GiftsScreen> {
  late Future<List<Map<String, dynamic>>> _f = _load();
  final _search = TextEditingController();
  Set<String> _fav = {};
  bool _onlyFav = false;

  Future<List<Map<String, dynamic>>> _load() async {
    _fav = await _Favorites.load();
    if (!mounted) return const [];
    return asList(await AppScope.read(context).api.get('/api/gifts'));
  }

  void reload() => setState(() => _f = _load());

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _toggleFav(Map<String, dynamic> g) async {
    final state = AppScope.read(context);
    if (!state.loggedIn) return showSnack(context, 'Connecte-toi pour suivre un demandeur.');
    final owner = g.obj('owner').str('id');
    final on = !_fav.contains(owner);
    try {
      if (on) {
        await state.api.post('/api/gifts/${g.str('slug')}/favorite');
      } else {
        await state.api.delete('/api/gifts/${g.str('slug')}/favorite');
      }
      setState(() => on ? _fav.add(owner) : _fav.remove(owner));
      await _Favorites.save(_fav);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    }
  }

  Future<void> _create() async {
    if (!await requireLogin(context, message: 'Pour créer une demande A4G Gifts, crée un compte ou connecte-toi.')) return;
    if (!mounted) return;
    final created = await showCreateGiftSheet(context);
    if (created == true) reload();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final first = state.loggedIn ? state.displayName : 'gamer';
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.red,
          onRefresh: () async => reload(),
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _f,
            builder: (context, snap) {
              final q = _search.text.trim().toLowerCase();
              final gifts = (snap.data ?? const <Map<String, dynamic>>[]).where((g) {
                if (_onlyFav && !_fav.contains(g.obj('owner').str('id'))) return false;
                if (q.isEmpty) return true;
                return [g.obj('owner').str('name'), g.obj('product').str('name'), g.obj('product').str('game'), g.obj('product').str('variation_name')].any((s) => s.toLowerCase().contains(q));
              }).toList();
              return ListView(padding: const EdgeInsets.fromLTRB(12, 18, 12, 40), children: [
                Text('Salut, $first ❤️', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.ink)),
                const SizedBox(height: 2),
                const Text('Prêt à faire plaisir ?', style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
                const SizedBox(height: 22),
                const Text('Comment ça marche ?', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.ink)),
                const SizedBox(height: 14),
                Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                  _step(Icons.edit_note, 'Crée', _create),
                  _step(Icons.ios_share, 'Partage', () => showSnack(context, 'Partage ta demande pour recevoir des soutiens.')),
                  _step(Icons.favorite, 'Reçois', () => setState(() => _onlyFav = false)),
                  _step(Icons.redeem_outlined, 'Profite', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MyGiftRequestsScreen()))),
                ]),
                const SizedBox(height: 22),
                const Text('Demandes en cours', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.ink)),
                const SizedBox(height: 14),
                TextField(
                  controller: _search,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Rechercher un pseudo, un jeu ou un produit',
                    prefixIcon: const Icon(Icons.search, size: 28),
                    suffixIcon: IconButton(
                      icon: Icon(_onlyFav ? Icons.favorite : Icons.favorite_border, color: _onlyFav ? AppColors.red : AppColors.text),
                      onPressed: () => setState(() => _onlyFav = !_onlyFav),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                if (snap.connectionState != ConnectionState.done)
                  const LoadingView()
                else if (snap.hasError)
                  ErrorView(message: '${snap.error}', onRetry: reload)
                else if (gifts.isEmpty)
                  const InfoCard('Aucune demande en cours pour le moment.')
                else
                  for (final g in gifts) ...[
                    GiftCard(gift: g, favorite: _fav.contains(g.obj('owner').str('id')), onFavorite: () => _toggleFav(g), onTap: () async {
                      await Navigator.push(context, MaterialPageRoute(builder: (_) => GiftDetailScreen(slug: g.str('slug'), initial: g)));
                      reload();
                    }),
                    const SizedBox(height: 10),
                  ],
              ]);
            },
          ),
        ),
      ),
    );
  }

  Widget _step(IconData icon, String label, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(children: [
          Container(width: 60, height: 60, decoration: const BoxDecoration(color: Color(0xFFFDE8E8), shape: BoxShape.circle), child: Icon(icon, color: AppColors.red, size: 26)),
          const SizedBox(height: 10),
          Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.slate)),
        ]),
      );
}

class _GiftAvatar extends StatelessWidget {
  const _GiftAvatar({required this.gift, this.size = 52});
  final Map<String, dynamic> gift;
  final double size;
  @override
  Widget build(BuildContext context) {
    final url = gift.obj('owner').strOrNull('avatar_url');
    final name = gift.obj('owner').str('name');
    if (url == null) {
      return CircleAvatar(radius: size / 2, backgroundColor: const Color(0xFF0D47A1), child: Text(name.isEmpty ? '?' : name.characters.first.toUpperCase(), style: TextStyle(color: Colors.white, fontSize: size * .42)));
    }
    return ClipOval(child: Image.network(url, width: size, height: size, fit: BoxFit.cover, errorBuilder: (_, __, ___) => SizedBox(width: size, height: size)));
  }
}

class _Progress extends StatelessWidget {
  const _Progress({required this.gift, this.percentLabel = true});
  final Map<String, dynamic> gift;
  final bool percentLabel;
  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final pct = gift.number('progress_percent').clamp(0, 100);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: LinearProgressIndicator(value: pct / 100, minHeight: 9, backgroundColor: const Color(0xFFFDDCDA), color: AppColors.red),
      ),
      const SizedBox(height: 14),
      Text('${state.money(gift.number('funded_amount'))} / ${state.money(gift.number('goal_amount'))}${percentLabel ? ' · ${pct.round()}%' : ''}', style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: AppColors.slate)),
      const SizedBox(height: 6),
      Text('${gift.integer('supporters_count')} supporters', style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
    ]);
  }
}

class GiftCard extends StatelessWidget {
  const GiftCard({super.key, required this.gift, required this.onTap, this.favorite = false, this.onFavorite});
  final Map<String, dynamic> gift;
  final VoidCallback onTap;
  final bool favorite;
  final VoidCallback? onFavorite;

  @override
  Widget build(BuildContext context) {
    final p = gift.obj('product');
    return A4Card(
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(10, 12, 10, 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          _GiftAvatar(gift: gift),
          const SizedBox(width: 8),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(gift.obj('owner').str('name'), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.slate)),
              Text(p.str('game'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.slate)),
            ]),
          ),
          IconButton(icon: Icon(favorite ? Icons.favorite : Icons.favorite_border, color: favorite ? AppColors.red : AppColors.slate, size: 28), onPressed: onFavorite),
        ]),
        const SizedBox(height: 12),
        Text(p.str('name'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.ink)),
        const SizedBox(height: 4),
        Text(p.str('variation_name'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.red)),
        if (gift.strOrNull('message') != null) ...[
          const SizedBox(height: 6),
          Text(gift.str('message'), style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
        ],
        const SizedBox(height: 16),
        _Progress(gift: gift),
      ]),
    );
  }
}

/// A4G Gifts request: owner, product, progress, favourite, contribute, share (owner: cancel).
class GiftDetailScreen extends StatefulWidget {
  const GiftDetailScreen({super.key, required this.slug, this.initial});
  final String slug;
  final Map<String, dynamic>? initial;
  @override
  State<GiftDetailScreen> createState() => _GiftDetailScreenState();
}

class _GiftDetailScreenState extends State<GiftDetailScreen> {
  Map<String, dynamic>? _g;
  String? _error;
  bool _fav = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _g = widget.initial;
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final favs = await _Favorites.load();
    if (!mounted) return;
    try {
      final g = asMap(await AppScope.read(context).api.get('/api/gifts/${widget.slug}'));
      if (mounted) setState(() {
        _g = {...?_g, ...g};
        _fav = favs.contains(g.obj('owner').str('id'));
      });
    } on ApiException catch (e) {
      if (mounted && _g == null) setState(() => _error = e.message);
    }
  }

  bool get _mine => _g != null && AppScope.read(context).user?.str('id') == _g!.obj('owner').str('id');

  Future<void> _toggleFav() async {
    final state = AppScope.read(context);
    if (!state.loggedIn) return showSnack(context, 'Connecte-toi pour suivre un demandeur.');
    try {
      if (_fav) {
        await state.api.delete('/api/gifts/${widget.slug}/favorite');
      } else {
        await state.api.post('/api/gifts/${widget.slug}/favorite');
      }
      final favs = await _Favorites.load();
      final owner = _g!.obj('owner').str('id');
      _fav ? favs.remove(owner) : favs.add(owner);
      await _Favorites.save(favs);
      setState(() => _fav = !_fav);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    }
  }

  Future<void> _cancel() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Annuler la demande'),
        content: const Text('Les contributions déjà reçues seront remboursées sur le wallet des contributeurs.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Retour')),
          FilledButton(style: FilledButton.styleFrom(minimumSize: const Size(110, 44)), onPressed: () => Navigator.pop(context, true), child: const Text('Annuler')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    try {
      final g = asMap(await AppScope.read(context).api.post('/api/gifts/${widget.slug}/cancel'));
      setState(() => _g = {...?_g, ...g});
      if (mounted) showSnack(context, 'Demande annulée.');
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _contribute() async {
    if (!await requireLogin(context, message: 'Pour contribuer, crée un compte ou connecte-toi.')) return;
    if (!mounted || _g == null) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: const Color(0xFFFFF1F0),
      builder: (_) => _ContributionSheet(gift: _g!),
    );
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final g = _g;
    return Scaffold(
      appBar: AppBar(title: const Text('A4G Gifts')),
      body: g == null
          ? (_error != null ? ErrorView(message: _error!, onRetry: _load) : const LoadingView())
          : ListView(padding: const EdgeInsets.fromLTRB(14, 14, 14, 32), children: [
              Center(child: _GiftAvatar(gift: g, size: 78)),
              const SizedBox(height: 12),
              Center(child: Text(g.obj('owner').str('name'), textAlign: TextAlign.center, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w600, color: AppColors.ink, letterSpacing: 2))),
              Center(child: Text(g.obj('product').str('game'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.slate))),
              const SizedBox(height: 20),
              A4Card(
                padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(g.obj('product').str('name'), style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: AppColors.ink)),
                  const SizedBox(height: 4),
                  Text(g.obj('product').str('variation_name'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.red)),
                  if (g.strOrNull('message') != null) ...[const SizedBox(height: 10), Text(g.str('message'), style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w600, color: AppColors.slate))],
                  const SizedBox(height: 22),
                  _Progress(gift: g, percentLabel: false),
                  if (!['active', 'funded'].contains(g.str('status'))) ...[
                    const SizedBox(height: 10),
                    StatusPill(label: giftStatusLabel(g.str('status')), color: AppColors.slate, background: const Color(0xFFEFF1F5)),
                  ],
                ]),
              ),
              const SizedBox(height: 18),
              if (_mine) ...[
                if (['active', 'funded'].contains(g.str('status')))
                  OutlinedButton.icon(onPressed: _busy ? null : _cancel, icon: const Icon(Icons.cancel_outlined), label: const Text('Annuler ma demande')),
              ] else ...[
                OutlinedButton.icon(
                  onPressed: _toggleFav,
                  icon: Icon(_fav ? Icons.favorite : Icons.favorite_border),
                  label: Text(_fav ? 'Retirer ce demandeur des favoris' : 'Ajouter ce demandeur aux favoris'),
                ),
                const SizedBox(height: 10),
                Text('Ajoutez ${g.obj('owner').str('name')} à vos favoris pour être informé lorsqu’il aura besoin de soutien.', textAlign: TextAlign.center, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
                const SizedBox(height: 14),
                if (g.str('status') == 'active') FilledButton.icon(onPressed: _contribute, icon: const Icon(Icons.favorite), label: const Text('Contribuer')),
              ],
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: () => SharePlus.instance.share(ShareParams(text: 'Soutiens ma demande A4G Gifts : ${g.obj('product').str('name')} – ${g.obj('product').str('variation_name')}\n$giftShareBase${g.str('slug')}')),
                icon: const Icon(Icons.ios_share),
                label: const Text('Partager la demande'),
              ),
            ]),
    );
  }
}

class _ContributionSheet extends StatefulWidget {
  const _ContributionSheet({required this.gift});
  final Map<String, dynamic> gift;
  @override
  State<_ContributionSheet> createState() => _ContributionSheetState();
}

class _ContributionSheetState extends State<_ContributionSheet> {
  late final _amount = TextEditingController(text: '${widget.gift.number('remaining_amount').ceil()}');
  final _message = TextEditingController();
  final _key = DateTime.now().microsecondsSinceEpoch.toString();
  bool _anonymous = false;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _message.dispose();
    super.dispose();
  }

  Map<String, dynamic> get _body => {
        'amount': num.tryParse(_amount.text) ?? 0,
        'currency': widget.gift.str('currency', 'XOF'),
        'idempotency_key': 'a4g-$_key',
        'anonymous': _anonymous,
        if (_message.text.trim().isNotEmpty) 'message': _message.text.trim(),
      };

  Future<void> _wallet() async {
    setState(() => _busy = true);
    try {
      await AppScope.read(context).api.post('/api/gifts/${widget.gift.str('slug')}/contributions/wallet', _body);
      if (!mounted) return;
      Navigator.pop(context);
      showSnack(context, 'Contribution confirmée. Merci pour ton soutien !');
      AppScope.read(context).refreshSummary();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _checkout() async {
    setState(() => _busy = true);
    try {
      final res = await AppScope.read(context).api.post('/api/gifts/${widget.gift.str('slug')}/contributions/checkout', _body);
      final order = asMap(res).obj('order');
      if (!mounted) return;
      Navigator.pop(context);
      Navigator.push(context, MaterialPageRoute(builder: (_) => PaymentModeScreen(order: order)));
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(14, 0, 14, 14 + MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Contribuer', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.ink)),
          const SizedBox(height: 6),
          Text('Reste à financer : ${AppScope.of(context).money(widget.gift.number('remaining_amount'))}', style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.slate)),
          const SizedBox(height: 14),
          TextField(controller: _amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Montant', suffixText: 'FCFA')),
          const SizedBox(height: 10),
          TextField(controller: _message, maxLength: 160, decoration: const InputDecoration(hintText: 'Message (facultatif)')),
          SwitchListTile(value: _anonymous, onChanged: (v) => setState(() => _anonymous = v), title: const Text('Contribuer anonymement'), activeThumbColor: AppColors.red, contentPadding: EdgeInsets.zero),
          const SizedBox(height: 6),
          FilledButton.icon(onPressed: _busy ? null : _checkout, icon: const Icon(Icons.payment), label: const Text('Payer ma contribution')),
          const SizedBox(height: 10),
          OutlinedButton.icon(onPressed: _busy ? null : _wallet, icon: const Icon(Icons.account_balance_wallet_outlined), label: const Text('Payer avec mon wallet')),
        ]),
      ),
    );
  }
}

/// "Créer ma demande" sheet. Returns true when a request was published.
Future<bool?> showCreateGiftSheet(BuildContext context) => showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFFFF1F0),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => const _CreateGiftSheet(),
    );

class _CreateGiftSheet extends StatefulWidget {
  const _CreateGiftSheet();
  @override
  State<_CreateGiftSheet> createState() => _CreateGiftSheetState();
}

class _CreateGiftSheetState extends State<_CreateGiftSheet> {
  Map<String, dynamic>? _product;
  Map<String, dynamic>? _variation;
  String? _photo;
  final _uid = TextEditingController();
  final _nickname = TextEditingController();
  final _message = TextEditingController();
  bool _busy = false;
  String? _verifyMsg;

  @override
  void dispose() {
    _uid.dispose();
    _nickname.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final x = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 720, maxHeight: 720, imageQuality: 72);
    if (x == null) return;
    final bytes = await x.readAsBytes();
    if (bytes.length > 740 * 1024) return showSnack(context, 'Image trop lourde : choisis une image plus petite.');
    final mime = x.name.toLowerCase().endsWith('.png') ? 'png' : (x.name.toLowerCase().endsWith('.webp') ? 'webp' : 'jpeg');
    setState(() => _photo = 'data:image/$mime;base64,${base64Encode(bytes)}');
  }

  Future<void> _pickProduct() async {
    final picked = await showModalBottomSheet<(Map<String, dynamic>, Map<String, dynamic>?)>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _ProductPicker(),
    );
    if (picked != null) {
      setState(() {
        _product = picked.$1;
        _variation = picked.$2;
        _verifyMsg = null;
      });
    }
  }

  Future<void> _verify() async {
    if (_product == null) return setState(() => _verifyMsg = 'Choisis d’abord un produit.');
    if (_uid.text.trim().isEmpty) return setState(() => _verifyMsg = 'Entre l’ID joueur avant de publier la demande.');
    setState(() => _busy = true);
    try {
      final res = asMap(await AppScope.read(context).api.post('/api/player/verify', {
        'game': _product!.str('game', _product!.str('name')),
        'uid': _uid.text.trim(),
        if (_variation != null) 'variation_id': _variation!.str('variation_id'),
      }));
      final nick = res.strOrNull('nickname');
      setState(() {
        if (nick != null && nick != _uid.text.trim()) _nickname.text = nick;
        _verifyMsg = res.flag('verified', true) ? 'ID vérifié' : 'ID introuvable';
      });
    } on ApiException catch (e) {
      setState(() => _verifyMsg = e.status == 503 ? 'ID temporairement indisponible' : e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _publish() async {
    if (_product == null) return showSnack(context, 'Choisis d’abord un produit.');
    if (_uid.text.trim().isEmpty) return showSnack(context, 'Vérifie l’ID joueur avant de publier la demande.');
    if (_nickname.text.trim().isEmpty) return showSnack(context, 'Renseigne le pseudo du compte de jeu.');
    setState(() => _busy = true);
    try {
      await AppScope.read(context).api.post('/api/gifts', {
        'product_id': _product!.integer('id'),
        'game_uid': _uid.text.trim(),
        'nickname': _nickname.text.trim(),
        if (_message.text.trim().isNotEmpty) 'message': _message.text.trim(),
        if (_variation != null) 'variation_id': _variation!.str('variation_id'),
        if (_photo != null) 'profile_photo': _photo,
      });
      if (!mounted) return;
      Navigator.pop(context, true);
      showSnack(context, 'Ta demande est publiée. Partage-la pour recevoir des soutiens !');
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final productLabel = _product == null ? null : '${_product!.str('name')}${_variation != null ? ' · ${_variation!.str('name')}' : ''}';
    return Padding(
      padding: EdgeInsets.fromLTRB(14, 14, 14, 14 + MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 16, 14, 14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
          child: SingleChildScrollView(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Center(child: Text('Créer ma demande', style: TextStyle(fontSize: 26, color: AppColors.ink))),
              const SizedBox(height: 8),
              Center(child: Image.asset('assets/images/gifts/a4g-gift-box.png', height: 80 * 1.0 + 0)),
              const SizedBox(height: 12),
              InkWell(
                onTap: _pickPhoto,
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: const Color(0xFFFFF1F2), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFF7C9CC))),
                  child: Row(children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      clipBehavior: Clip.antiAlias,
                      child: _photo == null ? const Icon(Icons.add_a_photo, color: AppColors.red) : Image.memory(base64Decode(_photo!.split(',').last), fit: BoxFit.cover),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Photo de la demande', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.slate)),
                        Text('Choisis ta photo, un avatar ou une image personnelle.', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
                      ]),
                    ),
                    const Icon(Icons.chevron_right),
                  ]),
                ),
              ),
              const SizedBox(height: 10),
              const Text('Durée : 24 h. Le produit est commandé seulement si l’objectif est atteint.', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.slate)),
              const SizedBox(height: 12),
              InkWell(
                onTap: _pickProduct,
                child: InputDecorator(
                  decoration: const InputDecoration(labelText: 'Produit demandé', floatingLabelBehavior: FloatingLabelBehavior.always, prefixIcon: Icon(Icons.redeem_outlined), suffixIcon: Icon(Icons.search, size: 28)),
                  child: Text(productLabel ?? 'Rechercher et sélectionner', maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 16, color: productLabel == null ? AppColors.slate : AppColors.ink, fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(height: 10),
              TextField(controller: _uid, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'ID joueur / compte', hintStyle: TextStyle(fontSize: 17, color: AppColors.text))),
              const SizedBox(height: 10),
              OutlinedButton.icon(onPressed: _busy ? null : _verify, icon: const Icon(Icons.manage_search), label: const Text('Vérifier l’ID et récupérer le pseudo')),
              if (_verifyMsg != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(_verifyMsg!, style: TextStyle(fontWeight: FontWeight.w700, color: _verifyMsg == 'ID vérifié' ? AppColors.green : AppColors.red))),
              const SizedBox(height: 10),
              TextField(controller: _nickname, decoration: const InputDecoration(hintText: 'Pseudo du compte de jeu', hintStyle: TextStyle(fontSize: 17, color: AppColors.text), prefixIcon: Icon(Icons.sports_esports))),
              const SizedBox(height: 10),
              TextField(controller: _message, maxLength: 200, decoration: const InputDecoration(hintText: 'Message (facultatif)', hintStyle: TextStyle(fontSize: 17, color: AppColors.text))),
              const SizedBox(height: 4),
              FilledButton.icon(
                onPressed: _busy ? null : _publish,
                icon: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.volunteer_activism),
                label: const Text('Publier ma demande'),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

/// Product search for a gift request, then its option.
class _ProductPicker extends StatefulWidget {
  const _ProductPicker();
  @override
  State<_ProductPicker> createState() => _ProductPickerState();
}

class _ProductPickerState extends State<_ProductPicker> {
  final _q = TextEditingController();
  List<Map<String, dynamic>> _items = const [];
  Map<String, dynamic>? _product;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _search();
  }

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    setState(() => _loading = true);
    try {
      final res = await AppScope.read(context).api.get('/api/products', query: {'q': _q.text.trim(), 'per_page': 40});
      if (mounted) setState(() => _items = asList(res));
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final p = _product;
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.of(context).size.height * .8,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: Column(children: [
            if (p == null)
              TextField(controller: _q, textInputAction: TextInputAction.search, onSubmitted: (_) => _search(), decoration: const InputDecoration(hintText: 'Rechercher un produit', prefixIcon: Icon(Icons.search)))
            else
              ListTile(leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _product = null)), title: Text(p.str('name'), style: const TextStyle(fontWeight: FontWeight.w800))),
            const SizedBox(height: 8),
            if (_loading) const LinearProgressIndicator(color: AppColors.red),
            Expanded(
              child: ListView(children: [
                if (p == null)
                  for (final it in _items)
                    ListTile(
                      leading: ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.network(it.str('image_url'), width: 44, height: 44, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox(width: 44, height: 44))),
                      title: Text(it.str('name')),
                      subtitle: Text(it.str('game')),
                      onTap: () {
                        if (it.list('variations').length <= 1) {
                          Navigator.pop(context, (it, it.list('variations').isEmpty ? null : it.list('variations').first));
                        } else {
                          setState(() => _product = it);
                        }
                      },
                    )
                else
                  for (final v in p.list('variations').where((v) => v.flag('available', true)))
                    ListTile(title: Text(v.str('name')), trailing: Text(state.money(v.number('price'))), onTap: () => Navigator.pop(context, (p, v))),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

/// "Mes demandes": own A4G Gifts requests with their status.
class MyGiftRequestsScreen extends StatefulWidget {
  const MyGiftRequestsScreen({super.key});
  @override
  State<MyGiftRequestsScreen> createState() => _MyGiftRequestsScreenState();
}

class _MyGiftRequestsScreenState extends State<MyGiftRequestsScreen> {
  late Future<List<Map<String, dynamic>>> _f = _load();
  Future<List<Map<String, dynamic>>> _load() async => asList(await AppScope.read(context).api.get('/api/user/gifts'));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes demandes')),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _f,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) return const LoadingView();
          if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _f = _load()));
          final list = snap.data!;
          return RefreshIndicator(
            color: AppColors.red,
            onRefresh: () async => setState(() => _f = _load()),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
              itemCount: list.isEmpty ? 1 : list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                if (list.isEmpty) return const InfoCard('Vous n’avez pas encore créé de demande.');
                final g = list[i];
                final photo = g.obj('owner').strOrNull('avatar_url');
                return A4Card(
                  onTap: () async {
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => GiftDetailScreen(slug: g.str('slug'), initial: g)));
                    setState(() => _f = _load());
                  },
                  padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
                  child: Row(children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: photo != null
                          ? Image.network(photo, width: 62, height: 62, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Image.asset('assets/images/onboarding/slide-1.png', width: 62, height: 62))
                          : Image.asset('assets/images/onboarding/slide-1.png', width: 62, height: 62, fit: BoxFit.cover),
                    ),
                    const SizedBox(width: 18),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(g.obj('product').str('name'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.slate)),
                        const SizedBox(height: 4),
                        Text('${g.integer('supporters_count')} personne(s) vous ont soutenu', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.slate)),
                      ]),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFD9C9C7))),
                      child: Text(giftStatusLabel(g.str('status')), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF4A4040))),
                    ),
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
