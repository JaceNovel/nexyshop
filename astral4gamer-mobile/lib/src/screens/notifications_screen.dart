import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/ui.dart';
import 'gifts_screen.dart';
import 'order_tracking_screen.dart';
import 'support_screen.dart';

/// Notifications: personal ones (orders, payments, codes) followed by the public feed (offers).
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<List<Map<String, dynamic>>> _f = _load();

  Future<List<Map<String, dynamic>>> _load() async {
    final state = AppScope.read(context);
    final out = <Map<String, dynamic>>[];
    if (state.loggedIn) {
      try {
        out.addAll(asList(await state.api.get('/api/user/notifications'), 'items'));
      } catch (_) {}
    }
    try {
      out.addAll(asList(await state.api.get('/api/notifications/feed'), 'items').map((m) => {...m, '_feed': true}));
    } catch (e) {
      if (out.isEmpty) rethrow;
    }
    state.unreadNotifications = 0;
    return out;
  }

  Map<String, dynamic> _data(Map<String, dynamic> n) => n['data'] is Map ? Map<String, dynamic>.from(n['data']) : const {};
  String _title(Map<String, dynamic> n) => n.strOrNull('title') ?? _data(n).strOrNull('title') ?? 'Astral4Gamer';
  String _body(Map<String, dynamic> n) => n.strOrNull('description') ?? n.strOrNull('body') ?? '';

  Future<void> _open(Map<String, dynamic> n) async {
    final state = AppScope.read(context);
    if (n['_feed'] != true && !n.flag('read')) {
      state.api.post('/api/user/notifications/${n.str('id')}/read').catchError((_) => null);
    }
    final d = _data(n);
    final type = n.str('type');
    final orderId = d.strOrNull('order_id');
    if (orderId != null && !type.startsWith('gift_')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: orderId)));
      return;
    }
    final slug = d.strOrNull('gift_slug');
    if (slug != null) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => GiftDetailScreen(slug: slug)));
      return;
    }
    final href = n.strOrNull('href');
    if (href != null && href.startsWith('/')) {
      await openExternal(context, 'https://www.astral4gamer.com$href');
      return;
    }
    final body = _body(n);
    await showDialog(context: context, builder: (_) => AlertDialog(title: Text(_title(n)), content: Text(body), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))]));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [IconButton(icon: const Icon(Icons.refresh, size: 28), onPressed: () => setState(() => _f = _load()))],
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _f,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) return const LoadingView();
          if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _f = _load()));
          final list = snap.data!;
          if (list.isEmpty) {
            return const Padding(padding: EdgeInsets.all(12), child: InfoCard('Les notifications de l’application apparaîtront ici.'));
          }
          return RefreshIndicator(
            color: AppColors.red,
            onRefresh: () async => setState(() => _f = _load()),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final n = list[i];
                return A4Card(
                  onTap: () => _open(n),
                  padding: const EdgeInsets.fromLTRB(12, 14, 14, 14),
                  child: Row(children: [
                    Container(width: 48, height: 48, decoration: const BoxDecoration(color: AppColors.greenSoft, shape: BoxShape.circle), child: const Icon(Icons.campaign_outlined, color: AppColors.green)),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(_title(n), style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: AppColors.text)),
                        if (_body(n).isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(_body(n), style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w500, color: Color(0xFF4A4040))),
                        ],
                      ]),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.chevron_right, color: Color(0xFF4A4040)),
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
