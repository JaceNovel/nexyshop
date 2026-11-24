import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_theme.dart';
import '../widgets/ui.dart';

const supportCenterUrl = 'https://astral4gamer.com/contact';
const supportWhatsappUrl = 'https://wa.me/22873241366';
const discordUrl = 'https://discord.gg/astral4gamer';

Future<void> openExternal(BuildContext context, String url) async {
  final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  if (!ok && context.mounted) showSnack(context, 'Impossible d’ouvrir ce lien.');
}

/// Support: help centre, WhatsApp and Discord (opened outside the app).
class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Support')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
        children: [
          MenuTile(icon: Icons.support_agent, iconColor: AppColors.blue, title: 'Centre d’assistance', subtitle: 'Commande, paiement, livraison ou remboursement', external: true, onTap: () => openExternal(context, supportCenterUrl)),
          const SizedBox(height: 8),
          MenuTile(icon: Icons.chat_outlined, iconColor: AppColors.blue, title: 'WhatsApp', subtitle: 'Contacter directement l’équipe support', external: true, onTap: () => openExternal(context, supportWhatsappUrl)),
          const SizedBox(height: 8),
          MenuTile(icon: Icons.forum_outlined, iconColor: AppColors.blue, title: 'Discord', subtitle: 'Rejoindre la communauté Astral4Gamer', external: true, onTap: () => openExternal(context, discordUrl)),
        ],
      ),
    );
  }
}
