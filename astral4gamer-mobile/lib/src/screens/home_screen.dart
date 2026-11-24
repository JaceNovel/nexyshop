import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/astral_header.dart';
import '../widgets/product_card.dart';
import '../widgets/ui.dart';
import 'cashprize_screen.dart';
import 'product_detail_screen.dart';
import 'redeem_code_screen.dart';
import 'vip_screen.dart';

/// "Accueil": header (logo, wallet, language, notifications), search, hero, shortcuts, Cashprize, VIP, redeem code, popular products.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onOpenTab});
  final void Function(int tab, {String? category, String? search}) onOpenTab;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<Map<String, dynamic>>> _popular = _load();
  final _search = TextEditingController();

  Future<List<Map<String, dynamic>>> _load() async => asList(await AppScope.read(context).api.get('/api/products', query: {'per_page': 12, 'category': 'top-up'}));

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.page,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.red,
          onRefresh: () async {
            await AppScope.read(context).refreshSummary();
            setState(() => _popular = _load());
          },
          child: ListView(padding: EdgeInsets.zero, children: [
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(children: [
                const AstralHeader(),
                const SizedBox(height: 14),
                TextField(
                  controller: _search,
                  textInputAction: TextInputAction.search,
                  onSubmitted: (q) => widget.onOpenTab(1, search: q.trim()),
                  decoration: const InputDecoration(hintText: 'Rechercher jeux, cartes, produits...', prefixIcon: Icon(Icons.search, size: 28)),
                ),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(9, 12, 9, 30),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                _hero(),
                const SizedBox(height: 18),
                Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                  _shortcut(Icons.sports_esports, 'Crédits', () => widget.onOpenTab(1, category: 'top-up')),
                  _shortcut(Icons.redeem_outlined, 'Cartes', () => widget.onOpenTab(1, category: 'gift-card')),
                  _shortcut(Icons.vpn_key, 'Clés', () => widget.onOpenTab(1, category: 'game-key')),
                  _shortcut(Icons.grid_view_rounded, 'Catalogue', () => widget.onOpenTab(1)),
                ]),
                const SizedBox(height: 16),
                _banner(const Color(0xFFFFF8EC), const Color(0xFFF2D7A6), AppColors.gold, Icons.workspace_premium, 'Cashprize', 'Découvrir les prochaines campagnes et récompenses.', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CashprizeScreen()))),
                const SizedBox(height: 10),
                _banner(const Color(0xFFF3F4F8), const Color(0xFFDDE1EA), AppColors.dark, Icons.military_tech_outlined, 'Récompenses VIP', 'Ta fidélité te rapporte des crédits et des avantages.', () {
                  if (!AppScope.read(context).loggedIn) return widget.onOpenTab(4);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const VipScreen()));
                }),
                const SizedBox(height: 10),
                _banner(const Color(0xFFFFF1F2), const Color(0xFFF7C9CC), AppColors.red, Icons.confirmation_number_outlined, 'Redeem code', 'Utilise un code promo Astral4Gamer.', () {
                  if (!AppScope.read(context).loggedIn) return widget.onOpenTab(4);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const RedeemCodeScreen()));
                }),
                const SizedBox(height: 18),
                Row(children: [
                  const Expanded(child: Text('Recharges populaires', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.slate))),
                  TextButton(onPressed: () => widget.onOpenTab(1, category: 'top-up'), child: const Text('Voir tout')),
                ]),
                const SizedBox(height: 8),
                FutureBuilder<List<Map<String, dynamic>>>(
                  future: _popular,
                  builder: (context, snap) {
                    if (snap.connectionState != ConnectionState.done) return const LoadingView();
                    if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _popular = _load()));
                    final items = snap.data!;
                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, crossAxisSpacing: 6, mainAxisSpacing: 14, childAspectRatio: .56),
                      itemCount: items.length,
                      itemBuilder: (_, i) => ProductCard(
                        product: items[i],
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductDetailScreen(productId: items[i].str('id'), initial: items[i]))),
                      ),
                    );
                  },
                ),
              ]),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _hero() => Container(
        height: 196,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFF3C9CC))),
        clipBehavior: Clip.antiAlias,
        child: Stack(children: [
          Positioned.fill(child: CustomPaint(painter: _HeroStripes())),
          Positioned(
            right: 16,
            top: 66,
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.bolt, color: AppColors.red, size: 30),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 110, 14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFE9EEF8), borderRadius: BorderRadius.circular(5)),
                child: const Text('LIVRAISON RAPIDE', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF1E3A8A), letterSpacing: .4)),
              ),
              const SizedBox(height: 10),
              const Text('Recharge instantanée', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800, color: AppColors.ink)),
              const SizedBox(height: 6),
              const Text('Diamants, UC, cartes cadeaux et clés de jeux livrés sans attendre.', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w500, color: AppColors.slate)),
              const Spacer(),
              Material(
                color: const Color(0xFFB0000E),
                borderRadius: BorderRadius.circular(8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () => widget.onOpenTab(1, category: 'top-up'),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Text('Voir les recharges', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_forward, color: Colors.white, size: 20),
                    ]),
                  ),
                ),
              ),
            ]),
          ),
        ]),
      );

  Widget _shortcut(IconData icon, String label, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(children: [
          Container(width: 56, height: 56, decoration: BoxDecoration(color: const Color(0xFFEFF3FA), borderRadius: BorderRadius.circular(14)), child: Icon(icon, color: AppColors.blue, size: 28)),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
        ]),
      );

  Widget _banner(Color bg, Color border, Color accent, IconData icon, String title, String subtitle, VoidCallback onTap) => Material(
        color: bg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: border)),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
            child: Row(children: [
              Container(width: 46, height: 46, decoration: BoxDecoration(color: accent, shape: BoxShape.circle), child: Icon(icon, color: Colors.white, size: 24)),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.slate)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.slate)),
                ]),
              ),
              const Icon(Icons.chevron_right, color: AppColors.ink),
            ]),
          ),
        ),
      );
}

/// Red/blue diagonal band on the right of the hero card.
class _HeroStripes extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    final red = Paint()..color = const Color(0xFFB0000E);
    final blue = Paint()..color = const Color(0xFF1E3A8A);
    canvas.drawPath(Path()..moveTo(w - 112, 0)..lineTo(w, 0)..lineTo(w, h)..lineTo(w - 82, h)..close(), red);
    canvas.drawPath(Path()..moveTo(w - 92, 0)..lineTo(w - 80, 0)..lineTo(w - 50, h)..lineTo(w - 62, h)..close(), blue);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
