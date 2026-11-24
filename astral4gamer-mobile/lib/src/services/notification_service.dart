import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'app_state.dart';

/// Push notifications (Firebase Cloud Messaging): registers the device with the API, shows
/// notifications received while the app is open, and opens the right screen when one is tapped.
class NotificationService {
  NotificationService._();
  static final instance = NotificationService._();

  final _local = FlutterLocalNotificationsPlugin();
  AppState? _state;
  String? _token;
  bool _started = false;

  /// Opens a screen for a notification path (e.g. /orders/123, /g/45).
  void Function(String path, Map<String, String> query)? onOpen;

  static const _channel = AndroidNotificationChannel('astral4gamer_default', 'Astral4Gamer', description: 'Commandes, paiements et offres', importance: Importance.high);

  void attach(AppState state) {
    _state = state;
    state.addListener(_onState);
    _onState();
  }

  void _onState() {
    if (_state?.loggedIn == true) {
      start();
      if (_token != null) _register(_token!);
    }
  }

  Future<void> start() async {
    if (_started || Firebase.apps.isEmpty) return;
    _started = true;
    try {
      await _local.initialize(
        settings: const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher'), iOS: DarwinInitializationSettings()),
        onDidReceiveNotificationResponse: (r) => _openPayload(r.payload),
      );
      await _local.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.createNotificationChannel(_channel);
      final fm = FirebaseMessaging.instance;
      await fm.requestPermission();
      _token = await fm.getToken();
      if (_token != null) await _register(_token!);
      fm.onTokenRefresh.listen(_register);
      FirebaseMessaging.onMessage.listen(_showForeground);
      FirebaseMessaging.onMessageOpenedApp.listen((m) => _openData(m.data));
      final initial = await fm.getInitialMessage();
      if (initial != null) _openData(initial.data);
    } catch (_) {}
  }

  String? _registered;
  Future<void> _register(String token) async {
    final state = _state;
    if (state == null || !state.loggedIn || _registered == '$token|${state.api.token}') return;
    try {
      final info = await PackageInfo.fromPlatform();
      await state.api.post('/api/user/notification-devices', {
        'installation_id': state.installationId,
        'platform': Platform.isIOS ? 'ios' : 'android',
        'push_provider': 'fcm',
        'push_token': token,
        'notifications_enabled': true,
        'app_version': info.version,
        'build_number': int.tryParse(info.buildNumber),
      });
      _registered = '$token|${state.api.token}';
    } catch (_) {}
  }

  Future<void> _showForeground(RemoteMessage m) async {
    final n = m.notification;
    if (n == null) return;
    await _local.show(
      id: m.hashCode,
      title: n.title,
      body: n.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(_channel.id, _channel.name, channelDescription: _channel.description, importance: Importance.high, priority: Priority.high),
        iOS: const DarwinNotificationDetails(),
      ),
      payload: jsonEncode(m.data),
    );
    _state?.unreadNotifications++;
  }

  void _openPayload(String? payload) {
    if (payload == null || payload.isEmpty) return;
    try {
      _openData(Map<String, dynamic>.from(jsonDecode(payload) as Map));
    } catch (_) {}
  }

  void _openData(Map<String, dynamic> data) {
    final url = '${data['url'] ?? data['href'] ?? ''}';
    final orderId = '${data['order_id'] ?? ''}';
    final slug = '${data['gift_slug'] ?? ''}';
    if (orderId.isNotEmpty && orderId != 'null' && !'${data['type']}'.startsWith('gift_')) {
      onOpen?.call('/orders/$orderId', const {});
    } else if (slug.isNotEmpty && slug != 'null') {
      onOpen?.call('/g/$slug', const {});
    } else if (url.isNotEmpty) {
      final u = Uri.tryParse(url);
      if (u != null) onOpen?.call(u.scheme == 'astral4gamer' ? '/${u.host}${u.path}' : u.path, u.queryParameters);
    }
  }
}
