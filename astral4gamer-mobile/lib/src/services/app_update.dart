import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_theme.dart';

/// Checks https://astral4gamer.com/mobile-version.json and offers the update (forced below the minimum).
class AppUpdate {
  /// {"version","build","minimum_build","apk_url","store_url","play_store_url","notes":[...]}
  static const versionUrl = 'https://api.astral4gamer.com/downloads/mobile-version.json';
  static const playUrl = 'https://play.google.com/store/apps/details?id=com.astral4gamer.mobile';

  static Future<void> check(BuildContext context) async {
    try {
      final res = await http.get(Uri.parse(versionUrl)).timeout(const Duration(seconds: 10));
      if (res.statusCode != 200) return;
      final j = jsonDecode(utf8.decode(res.bodyBytes));
      if (j is! Map) return;
      final info = await PackageInfo.fromPlatform();
      final build = int.tryParse(info.buildNumber) ?? 0;
      final latestBuild = (j['build'] as num?)?.toInt() ?? 0;
      final minimumBuild = (j['minimum_build'] as num?)?.toInt() ?? 0;
      final latest = '${j['version'] ?? ''}';
      final forced = build > 0 && build < minimumBuild;
      if (!(forced || (build > 0 && build < latestBuild) || (latest.isNotEmpty && _lower(info.version, latest)))) return;
      String pick(List<String> keys) => keys.map((k) => '${j[k] ?? ''}').firstWhere((s) => s.isNotEmpty, orElse: () => '');
      final url = Platform.isIOS ? pick(['store_url']) : (pick(['play_store_url', 'store_url', 'apk_url']).isEmpty ? playUrl : pick(['play_store_url', 'store_url', 'apk_url']));
      final notes = j['notes'] is List ? (j['notes'] as List).join('\n') : '${j['notes'] ?? ''}';
      if (!context.mounted) return;
      await showDialog(
        context: context,
        barrierDismissible: !forced,
        builder: (_) => _UpdateDialog(version: latest, url: url, forced: forced, notes: notes),
      );
    } catch (_) {}
  }

  static bool _lower(String a, String b) {
    List<int> p(String v) => v.split(RegExp(r'[.+]')).map((s) => int.tryParse(s) ?? 0).toList();
    final x = p(a), y = p(b);
    for (var i = 0; i < 3; i++) {
      final xi = i < x.length ? x[i] : 0, yi = i < y.length ? y[i] : 0;
      if (xi != yi) return xi < yi;
    }
    return false;
  }
}

class _UpdateDialog extends StatefulWidget {
  const _UpdateDialog({required this.version, required this.url, required this.forced, required this.notes});
  final String version;
  final String url;
  final bool forced;
  final String notes;
  @override
  State<_UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends State<_UpdateDialog> {
  String? _error;

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !widget.forced,
      child: AlertDialog(
        title: const Text('Mise à jour disponible'),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('La version ${widget.version} d’Astral4Gamer est disponible.', style: const TextStyle(color: AppColors.slate, fontWeight: FontWeight.w600)),
          if (widget.notes.isNotEmpty) ...[const SizedBox(height: 8), Text(widget.notes, style: const TextStyle(color: AppColors.slate))],
          if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: const TextStyle(color: AppColors.red))],
        ]),
        actions: [
          if (!widget.forced) TextButton(onPressed: () => Navigator.pop(context), child: const Text('Plus tard')),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(120, 44)),
            onPressed: () async {
              final ok = widget.url.isNotEmpty && await launchUrl(Uri.parse(widget.url), mode: LaunchMode.externalApplication);
              if (!ok) setState(() => _error = 'Impossible d’ouvrir la page de mise à jour.');
            },
            child: const Text('Mettre à jour'),
          ),
        ],
      ),
    );
  }
}
