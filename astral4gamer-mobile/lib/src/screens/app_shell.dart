import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'account_screen.dart';
import 'cart_screen.dart';
import 'catalog_screen.dart';
import 'gifts_screen.dart';
import 'home_screen.dart';

/// Bottom navigation of the app: Accueil, Catégories, A4G Gifts (red centre button), Panier, Mon Compte.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  static AppShellState? of(BuildContext context) => context.findAncestorStateOfType<AppShellState>();

  @override
  State<AppShell> createState() => AppShellState();
}

class AppShellState extends State<AppShell> {
  int index = 0;
  final _catalogKey = GlobalKey<CatalogScreenState>();
  final _giftsKey = GlobalKey<GiftsScreenState>();

  /// Opens a tab: 0 home, 1 categories, 2 gifts, 3 cart, 4 account. [category] preselects a catalogue filter.
  void go(int tab, {String? category, String? search}) {
    setState(() => index = tab);
    if (tab == 1 && (category != null || search != null)) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _catalogKey.currentState?.applyFilter(category: category, search: search));
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(onOpenTab: go),
      CatalogScreen(key: _catalogKey),
      GiftsScreen(key: _giftsKey),
      const CartScreen(),
      const AccountScreen(),
    ];
    return PopScope(
      canPop: index == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => index = 0);
      },
      child: Scaffold(
        body: IndexedStack(index: index, children: pages),
        bottomNavigationBar: _BottomBar(index: index, onTap: go),
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({required this.index, required this.onTap});
  final int index;
  final void Function(int) onTap;

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).padding.bottom;
    return SizedBox(
      height: 72 + bottom,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            child: Container(
              padding: EdgeInsets.only(bottom: bottom),
              decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Color(0xFFEDEFF3)))),
              child: Row(
                children: [
                  _item(0, Icons.home_outlined, Icons.home, 'Accueil', AppColors.red),
                  _item(1, Icons.menu, Icons.menu, 'Catégories', AppColors.blue),
                  const Expanded(child: SizedBox()),
                  _item(3, Icons.shopping_cart_outlined, Icons.shopping_cart, 'Panier', AppColors.red),
                  _item(4, Icons.person_outline, Icons.person, 'Mon Compte', AppColors.blue),
                ],
              ),
            ),
          ),
          Positioned(
            top: -26,
            left: 0,
            right: 0,
            child: Center(
              child: GestureDetector(
                onTap: () => onTap(2),
                child: Container(
                  width: 66,
                  height: 66,
                  decoration: BoxDecoration(
                    color: AppColors.red,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 5),
                    boxShadow: [BoxShadow(color: AppColors.red.withValues(alpha: .28), blurRadius: 18, offset: const Offset(0, 6))],
                  ),
                  child: const Icon(Icons.volunteer_activism, color: Colors.white, size: 30),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _item(int i, IconData icon, IconData selectedIcon, String label, Color selectedColor) {
    final selected = index == i;
    return Expanded(
      child: InkWell(
        onTap: () => onTap(i),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(selected ? selectedIcon : icon, size: 28, color: selected ? selectedColor : const Color(0xFF3D3838)),
            const SizedBox(height: 6),
            Text(label, style: TextStyle(fontSize: 14, letterSpacing: .2, fontWeight: selected ? FontWeight.w600 : FontWeight.w500, color: selected ? AppColors.ink : const Color(0xFF3D3838))),
          ],
        ),
      ),
    );
  }
}
