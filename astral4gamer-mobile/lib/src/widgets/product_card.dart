import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';

/// Catalogue tile: square image, blue name, price aligned right.
class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, required this.onTap});
  final Map<String, dynamic> product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final img = product.strOrNull('image_url');
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        AspectRatio(
          aspectRatio: 1,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: img == null
                ? Container(color: AppColors.blueSoft, child: const Icon(Icons.sports_esports, color: AppColors.blue, size: 36))
                : Image.network(img, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: AppColors.blueSoft, child: const Icon(Icons.image_not_supported_outlined, color: AppColors.blue))),
          ),
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(product.str('name'), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w500, color: AppColors.blue, height: 1.25)),
        ),
        const Spacer(),
        Align(
          alignment: Alignment.centerRight,
          child: Text(state.money(product.number('price')), style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w500, color: AppColors.ink)),
        ),
      ]),
    );
  }
}
