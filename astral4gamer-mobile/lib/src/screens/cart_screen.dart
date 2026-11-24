import 'package:flutter/material.dart';

import '../models/cart_item.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/ui.dart';
import 'payment_mode_screen.dart';

/// "Panier": lines with quantity steppers, total, "Continuer au paiement".
class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final items = state.cart;
    return Scaffold(
      appBar: AppBar(title: const Text('Panier')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(12, 6, 12, 24),
        children: [
          if (items.isEmpty) const InfoCard('Votre panier est vide. Ajoutez un produit depuis le catalogue.'),
          for (final it in items) ...[_line(context, it), const SizedBox(height: 10)],
          if (items.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(children: [
                const Text('Total', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.slate)),
                const Spacer(),
                Text(state.money(state.cartTotal), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.red)),
              ]),
            ),
        ],
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 50),
        child: FilledButton(
          style: FilledButton.styleFrom(disabledBackgroundColor: const Color(0xFFE2E2E2), disabledForegroundColor: const Color(0xFF9A9A9A)),
          onPressed: items.isEmpty ? null : () => Navigator.push(context, MaterialPageRoute(builder: (_) => PaymentModeScreen(items: List.of(items), fromCart: true))),
          child: const Text('Continuer au paiement'),
        ),
      ),
    );
  }

  Widget _line(BuildContext context, CartItem it) {
    final state = AppScope.read(context);
    return A4Card(
      padding: const EdgeInsets.all(10),
      child: Row(children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: it.imageUrl == null
              ? Container(width: 64, height: 64, color: AppColors.redSoft, child: const Icon(Icons.sports_esports, color: AppColors.red))
              : Image.network(it.imageUrl!, width: 64, height: 64, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(width: 64, height: 64, color: AppColors.redSoft)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(it.productName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.text)),
            Text(it.variationName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.red)),
            if (it.fields.isNotEmpty) Text(it.fields.values.join(' · '), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: AppColors.slate)),
            const SizedBox(height: 4),
            Text(state.money(it.unitPrice * it.quantity), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.ink)),
          ]),
        ),
        Column(children: [
          IconButton(visualDensity: VisualDensity.compact, icon: const Icon(Icons.delete_outline, color: AppColors.slate), onPressed: () => state.removeFromCart(it)),
          Row(children: [
            _round(Icons.remove, () => state.updateQuantity(it, it.quantity - 1), grey: true),
            Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: Text('${it.quantity}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate))),
            _round(Icons.add, () => state.updateQuantity(it, it.quantity + 1)),
          ]),
        ]),
      ]),
    );
  }

  Widget _round(IconData icon, VoidCallback onTap, {bool grey = false}) => InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(color: grey ? const Color(0xFFE5E5E5) : const Color(0xFFFDDCDA), shape: BoxShape.circle),
          child: Icon(icon, size: 18, color: AppColors.ink),
        ),
      );
}
