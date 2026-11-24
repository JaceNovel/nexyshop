import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/product_card.dart';
import '../widgets/ui.dart';
import 'product_detail_screen.dart';

/// Catalogue groups shown as the four big cards (filter = product `type`).
const catalogGroups = [
  ('top-up', Icons.sports_esports, 'Crédits de jeu', 'Diamants, UC, CP et recharges'),
  ('gift-card', Icons.redeem_outlined, 'Cartes cadeaux', 'Cartes digitales prêtes à utiliser'),
  ('game-key', Icons.vpn_key, 'Clés de jeux', 'Jeux PC et contenus premium'),
  (null, Icons.grid_view_rounded, 'Tout le catalogue', 'Tous les produits Astral4Gamer'),
];

/// "Catégories": search, groups, brand chips, product grid (paginated).
class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key, this.standalone = false, this.initialCategory, this.initialSearch});
  final bool standalone;
  final String? initialCategory;
  final String? initialSearch;

  @override
  State<CatalogScreen> createState() => CatalogScreenState();
}

class CatalogScreenState extends State<CatalogScreen> {
  final _search = TextEditingController();
  final _searchFocus = FocusNode();
  final _scroll = ScrollController();
  Timer? _debounce;
  String? _group;
  String? _brand;
  bool _cheapFirst = false;
  List<Map<String, dynamic>> _brands = const [];
  final List<Map<String, dynamic>> _products = [];
  int _page = 1;
  int _total = 0;
  int _lastPage = 1;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _group = widget.initialCategory;
    _search.text = widget.initialSearch ?? '';
    _scroll.addListener(() {
      if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 600) _more();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadBrands();
      _reload();
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _searchFocus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void applyFilter({String? category, String? search}) {
    setState(() {
      _group = category;
      _brand = null;
      if (search != null) _search.text = search;
    });
    _reload();
  }

  Future<void> _loadBrands() async {
    try {
      final res = await AppScope.read(context).api.get('/api/products/categories');
      if (mounted) setState(() => _brands = asList(res));
    } catch (_) {}
  }

  Future<void> _reload() async {
    _products.clear();
    _page = 1;
    _lastPage = 1;
    await _fetch();
  }

  Future<void> _more() async {
    if (_loading || _page >= _lastPage) return;
    _page++;
    await _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await AppScope.read(context).api.get('/api/products', query: {
        'per_page': 30,
        'page': _page,
        'q': _search.text.trim(),
        'category': _brand ?? _group,
      });
      final m = res is Map ? Map<String, dynamic>.from(res) : <String, dynamic>{};
      if (!mounted) return;
      setState(() {
        _products.addAll(asList(res));
        _total = m.integer('total', _products.length);
        _lastPage = m.integer('last_page', 1);
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _sorted {
    if (!_cheapFirst) return _products;
    return [..._products]..sort((a, b) => a.number('price').compareTo(b.number('price')));
  }

  @override
  Widget build(BuildContext context) {
    final products = _sorted;
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: widget.standalone,
        title: const Text('Catégories'),
        actions: [IconButton(icon: const Icon(Icons.refresh, size: 28), onPressed: () {
          _loadBrands();
          _reload();
        })],
      ),
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 34),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          _fab(Icons.add, () => _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 400), curve: Curves.easeOut)),
          const SizedBox(width: 60),
          _fab(Icons.search, () {
            _scroll.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
            _searchFocus.requestFocus();
          }),
        ]),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      body: RefreshIndicator(
        color: AppColors.red,
        onRefresh: _reload,
        child: CustomScrollView(
          controller: _scroll,
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(9, 6, 9, 0),
              sliver: SliverList.list(children: [
                TextField(
                  controller: _search,
                  focusNode: _searchFocus,
                  textInputAction: TextInputAction.search,
                  onSubmitted: (_) => _reload(),
                  onChanged: (_) {
                    _debounce?.cancel();
                    _debounce = Timer(const Duration(milliseconds: 450), _reload);
                  },
                  decoration: const InputDecoration(hintText: 'Rechercher un produit', prefixIcon: Icon(Icons.search, size: 28)),
                ),
                const SizedBox(height: 10),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  childAspectRatio: 1.55,
                  children: [for (final g in catalogGroups) _groupCard(g)],
                ),
                if (_brands.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 74 + 4,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _brands.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (_, i) => _brandChip(_brands[i]),
                    ),
                  ),
                ],
                const SizedBox(height: 18),
                Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Produits', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.slate)),
                      Text('$_total disponibles', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.slate)),
                    ]),
                  ),
                  IconButton(
                    tooltip: 'Trier par prix',
                    icon: Icon(Icons.swap_vert, color: _cheapFirst ? AppColors.red : AppColors.ink, size: 28),
                    onPressed: () => setState(() => _cheapFirst = !_cheapFirst),
                  ),
                ]),
                const SizedBox(height: 12),
              ]),
            ),
            if (_error != null && products.isEmpty)
              SliverToBoxAdapter(child: ErrorView(message: _error!, onRetry: _reload))
            else if (!_loading && products.isEmpty)
              const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.all(9), child: InfoCard('Aucun produit ne correspond à ta recherche.')))
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(9, 0, 9, 0),
                sliver: SliverGrid.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, crossAxisSpacing: 6, mainAxisSpacing: 14, childAspectRatio: .56),
                  itemCount: products.length,
                  itemBuilder: (_, i) => ProductCard(
                    product: products[i],
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductDetailScreen(productId: products[i].str('id'), initial: products[i]))),
                  ),
                ),
              ),
            SliverToBoxAdapter(child: _loading ? const LoadingView() : const SizedBox(height: 120)),
          ],
        ),
      ),
    );
  }

  Widget _fab(IconData icon, VoidCallback onTap) => Material(
        color: AppColors.red,
        shape: const CircleBorder(),
        elevation: 4,
        child: InkWell(customBorder: const CircleBorder(), onTap: onTap, child: SizedBox(width: 60, height: 60, child: Icon(icon, color: Colors.white, size: 32))),
      );

  Widget _groupCard((String?, IconData, String, String) g) {
    final selected = _brand == null && _group == g.$1 && (g.$1 != null || true) && (g.$1 == _group);
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () {
        setState(() {
          _group = g.$1;
          _brand = null;
        });
        _reload();
      },
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 12, 10, 10),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFEFF4FD) : const Color(0xFFF6F8FD),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? AppColors.blue : const Color(0xFFE1E8F3), width: selected ? 1.3 : 1),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(g.$2, color: AppColors.blue, size: 28),
          const Spacer(),
          Text(g.$3, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.slate)),
          const SizedBox(height: 4),
          Text(g.$4, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
        ]),
      ),
    );
  }

  Widget _brandChip(Map<String, dynamic> b) {
    final name = b.str('name');
    final img = b.strOrNull('image_url');
    final selected = _brand == name;
    return InkWell(
      onTap: () {
        setState(() => _brand = selected ? null : name);
        _reload();
      },
      child: SizedBox(
        width: 54 + 10,
        child: Column(children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: selected ? AppColors.blue : const Color(0xFFEDEFF3), width: selected ? 2 : 1), color: Colors.white),
            clipBehavior: Clip.antiAlias,
            child: img == null ? const Icon(Icons.sports_esports, color: AppColors.blue) : Image.network(img, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.sports_esports, color: AppColors.blue)),
          ),
          const SizedBox(height: 6),
          Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: AppColors.ink)),
        ]),
      ),
    );
  }
}
