import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/cart_item.dart';
import 'api_client.dart';

/// Global state: session, user, language, display currency and cart. Persisted on the device.
class AppState extends ChangeNotifier {
  AppState({ApiClient? api}) : api = api ?? ApiClient() {
    this.api.onUnauthorized = () => logout(silent: true);
  }

  final ApiClient api;
  static const _secure = FlutterSecureStorage();
  static const _kToken = 'a4g_token';
  SharedPreferences? _prefs;

  Map<String, dynamic>? user;
  String language = 'fr';
  String currency = 'XOF';
  bool onboardingDone = false;
  bool ready = false;
  final List<CartItem> cart = [];
  int ordersCount = 0;
  String vipLevel = '';
  num walletBalance = 0;
  int unreadNotifications = 0;

  bool get loggedIn => api.token != null && api.token!.isNotEmpty;
  String get displayName {
    final u = user;
    if (u == null) return 'Invité Astral';
    return u.strOrNull('name') ?? u.strOrNull('username') ?? u.str('email');
  }

  String get currencyLabel => currency == 'EUR' ? '€' : 'FCFA';

  /// Backend fixed rates (config): 660 XOF per EUR, 610 XOF per USD.
  static const xofPerEur = 660;
  static const xofPerUsd = 610;

  /// Formats an XOF amount in the display currency chosen in "Langue et devise".
  String money(num xof) => currency == 'EUR' ? formatPrice(xof / xofPerEur, 'EUR') : formatPrice(xof, 'XOF');

  static String formatPrice(num amount, String cur) {
    if (cur == 'EUR') return '${amount.toStringAsFixed(2).replaceAll('.', ',')} €';
    return '${amount.round()} FCFA';
  }

  /// Stable id of this installation (for user/notification-devices).
  String get installationId {
    var id = _prefs?.getString('installation_id');
    if (id == null) {
      final r = DateTime.now().microsecondsSinceEpoch;
      String hex(int n, int len) => n.toRadixString(16).padLeft(len, '0').substring(0, len);
      final rnd = List.generate(4, (i) => (r * (i + 7919) ^ (r >> (i + 3))) & 0xFFFFFFFF);
      id = '${hex(rnd[0], 8)}-${hex(rnd[1] & 0xFFFF, 4)}-4${hex(rnd[1] >> 16 & 0xFFF, 3)}-a${hex(rnd[2] & 0xFFF, 3)}-${hex(rnd[3], 8)}${hex(rnd[2] >> 12 & 0xFFFF, 4)}';
      _prefs?.setString('installation_id', id);
    }
    return id;
  }

  Future<void> load() async {
    _prefs = await SharedPreferences.getInstance();
    language = _prefs!.getString('language') ?? 'fr';
    currency = _prefs!.getString('currency') ?? 'XOF';
    onboardingDone = _prefs!.getBool('onboarding_done') ?? false;
    final rawCart = _prefs!.getString('cart');
    if (rawCart != null) {
      try {
        cart
          ..clear()
          ..addAll((jsonDecode(rawCart) as List).whereType<Map>().map((m) => CartItem.fromJson(Map<String, dynamic>.from(m))));
      } catch (_) {}
    }
    api
      ..locale = language
      ..currency = currency;
    try {
      api.token = await _secure.read(key: _kToken);
    } catch (_) {
      api.token = null;
    }
    ready = true;
    notifyListeners();
    if (loggedIn) await refreshUser();
  }

  Future<void> setSession(String token, [Map<String, dynamic>? u]) async {
    api.token = token;
    await _secure.write(key: _kToken, value: token);
    if (u != null) user = u;
    notifyListeners();
    await refreshUser();
  }

  Future<void> refreshUser() async {
    if (!loggedIn) return;
    try {
      // No /api/user route: the full user record comes from user/google-profile.
      final me = await api.get('/api/user/google-profile');
      if (me is Map && me['user'] is Map) {
        final u = Map<String, dynamic>.from(me['user'] as Map)..remove('google_accounts');
        user = u;
        notifyListeners();
      }
    } on ApiException catch (e) {
      if (e.unauthorized) return;
    }
    await refreshSummary();
  }

  /// Orders count, VIP level and wallet balance shown on the account and home screens.
  Future<void> refreshSummary() async {
    if (!loggedIn) return;
    await Future.wait([
      api.get('/api/user/vip').then((v) {
        final m = asMap(v);
        vipLevel = m.strOrNull('currentLevel') ?? vipLevel;
        ordersCount = m.integer('orders', ordersCount);
      }).catchError((_) {}),
      api.get('/api/user/wallet').then((v) {
        walletBalance = asMap(v).number('balance');
      }).catchError((_) {}),
    ]);
    notifyListeners();
  }

  Future<void> logout({bool silent = false}) async {
    api.token = null;
    user = null;
    ordersCount = 0;
    vipLevel = '';
    walletBalance = 0;
    try {
      await _secure.delete(key: _kToken);
    } catch (_) {}
    notifyListeners();
  }

  Future<void> setLanguageAndCurrency(String lang, String cur) async {
    language = lang;
    currency = cur;
    api
      ..locale = lang
      ..currency = cur;
    await _prefs?.setString('language', lang);
    await _prefs?.setString('currency', cur);
    notifyListeners();
  }

  Future<void> finishOnboarding() async {
    onboardingDone = true;
    await _prefs?.setBool('onboarding_done', true);
    notifyListeners();
  }

  // ───────────── Cart ─────────────
  int get cartCount => cart.fold(0, (n, i) => n + i.quantity);
  num get cartTotal => cart.fold<num>(0, (t, i) => t + i.unitPrice * i.quantity);

  void addToCart(CartItem item) {
    final existing = cart.indexWhere((c) => c.key == item.key);
    if (existing >= 0) {
      cart[existing] = cart[existing].copyWith(quantity: cart[existing].quantity + item.quantity);
    } else {
      cart.add(item);
    }
    _saveCart();
  }

  void updateQuantity(CartItem item, int quantity) {
    final i = cart.indexWhere((c) => c.key == item.key);
    if (i < 0) return;
    if (quantity <= 0) {
      cart.removeAt(i);
    } else {
      cart[i] = cart[i].copyWith(quantity: quantity);
    }
    _saveCart();
  }

  void removeFromCart(CartItem item) {
    cart.removeWhere((c) => c.key == item.key);
    _saveCart();
  }

  void clearCart() {
    cart.clear();
    _saveCart();
  }

  void _saveCart() {
    _prefs?.setString('cart', jsonEncode(cart.map((c) => c.toJson()).toList()));
    notifyListeners();
  }
}
