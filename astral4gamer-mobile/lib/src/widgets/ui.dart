import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// White rounded card with the thin grey border used on every screen.
class A4Card extends StatelessWidget {
  const A4Card({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap, this.color, this.borderColor});
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: borderColor ?? AppColors.border));
    return Material(
      color: color ?? Colors.white,
      shape: shape,
      clipBehavior: Clip.antiAlias,
      child: InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
    );
  }
}

/// Row card: coloured icon, bold title, subtitle, trailing chevron or "open external" icon.
class MenuTile extends StatelessWidget {
  const MenuTile({super.key, required this.icon, required this.title, this.subtitle, this.iconColor = AppColors.red, this.onTap, this.external = false, this.trailing});
  final IconData icon;
  final String title;
  final String? subtitle;
  final Color iconColor;
  final VoidCallback? onTap;
  final bool external;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return A4Card(
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 26),
          const SizedBox(width: 22),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: AppColors.text)),
                if (subtitle != null) ...[
                  const SizedBox(height: 3),
                  Text(subtitle!, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w500, color: Color(0xFF4A4040))),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          trailing ?? Icon(external ? Icons.open_in_new : Icons.chevron_right, color: const Color(0xFF4A4040), size: external ? 24 : 26),
        ],
      ),
    );
  }
}

/// Small coloured status pill ("À payer", "Livrée"...).
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.label, required this.color, required this.background});
  final String label;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(6)),
        child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color)),
      );
}

/// Grey bold section title ("Mon espace", "Votre code"...).
class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key, this.padding = const EdgeInsets.fromLTRB(0, 18, 0, 12)});
  final String text;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => Padding(
        padding: padding,
        child: Text(text, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.slate)),
      );
}

/// Light message card used for empty / error states ("Votre panier est vide...").
class InfoCard extends StatelessWidget {
  const InfoCard(this.text, {super.key, this.action, this.onAction});
  final String text;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => A4Card(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(text, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600, color: AppColors.slate)),
            if (action != null) ...[
              const SizedBox(height: 10),
              TextButton(onPressed: onAction, child: Text(action!)),
            ],
          ],
        ),
      );
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});
  @override
  Widget build(BuildContext context) => const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator(color: AppColors.red)));
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(16),
        child: InfoCard(message, action: onRetry == null ? null : 'Réessayer', onAction: onRetry),
      );
}

/// Avatar: network image, or the purple gradient placeholder of the original app.
class UserAvatar extends StatelessWidget {
  const UserAvatar({super.key, this.url, this.size = 108, this.letter});
  final String? url;
  final double size;
  final String? letter;

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF5B5BF7), Color(0xFFC14DF5)], begin: Alignment.topLeft, end: Alignment.bottomRight),
      ),
      child: letter != null
          ? Center(child: Text(letter!, style: TextStyle(color: Colors.white, fontSize: size * .42, fontWeight: FontWeight.w600)))
          : ClipOval(
              child: Stack(children: [
                Positioned(left: size * .3, top: size * .18, child: Container(width: size * .4, height: size * .4, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle))),
                Positioned(left: size * .16, top: size * .66, child: Container(width: size * .68, height: size * .5, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle))),
              ]),
            ),
    );
    if (url == null || url!.isEmpty) return placeholder;
    return ClipOval(child: Image.network(url!, width: size, height: size, fit: BoxFit.cover, errorBuilder: (_, __, ___) => placeholder));
  }
}

void showSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
