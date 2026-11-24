import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'screens/app_shell.dart';
import 'screens/gifts_screen.dart';
import 'screens/launch_welcome_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/order_tracking_screen.dart';
import 'screens/wallet_screen.dart';
import 'services/app_scope.dart';
import 'services/app_state.dart';
import 'services/app_update.dart';
import 'services/notification_service.dart';
import 'theme/app_theme.dart';

final navigatorKey = GlobalKey<NavigatorState>();

class AstralApp extends StatefulWidget {
  const AstralApp({super.key, required this.state});
  final AppState state;

  @override
  State<AstralApp> createState() => _AstralAppState();
}

class _AstralAppState extends State<AstralApp> {
  bool _welcomeDone = false;
  StreamSubscription<Uri>? _links;

  @override
  void initState() {
    super.initState();
    NotificationService.instance.onOpen = _openPath;
    _listenLinks();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = navigatorKey.currentContext;
      if (ctx != null) AppUpdate.check(ctx);
    });
  }

  @override
  void dispose() {
    _links?.cancel();
    super.dispose();
  }

  /// Deep links: astral4gamer://auth/link?token=… (Google / Discord login), https://astral4gamer.com/g/{gift}, order tracking.
  void _listenLinks() {
    final links = AppLinks();
    links.getInitialLink().then((u) {
      if (u != null) _handleLink(u);
    }).catchError((_) {});
    _links = links.uriLinkStream.listen(_handleLink, onError: (_) {});
  }

  /// astral4gamer://auth?token=… (Google), ://payment?order_id=… (payment return / notification),
  /// ://wallet?paymentId=… (top-up return), ://gifts?slug=…, https://astral4gamer.com/g/{slug}, ://auth/link?token=… (bot link).
  Future<void> _handleLink(Uri uri) async {
    final state = widget.state;
    final q = uri.queryParameters;
    final kind = uri.scheme == 'astral4gamer' ? uri.host : (uri.pathSegments.isNotEmpty ? uri.pathSegments.first : '');
    if (kind == 'auth') {
      final link = uri.pathSegments.contains('link');
      final token = q['token'];
      if (link && token != null && state.loggedIn) {
        try {
          await state.api.post('/api/auth/platform-links/consume', {'token': token});
          _snack('Compte lié avec succès.');
        } catch (e) {
          _snack('$e');
        }
      } else if (token != null && token.isNotEmpty) {
        await state.setSession(token);
        _snack('Connexion réussie.');
      } else if (q['error'] != null) {
        _snack(q['error']!);
      }
      return;
    }
    if (kind == 'wallet') {
      final ref = q['paymentId'];
      if (ref != null) navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => WalletTopupPendingScreen(reference: ref)));
      return;
    }
    if (kind == 'gifts' && q['slug'] != null) return _openPath('/g/${q['slug']}');
    _openPath(uri.scheme == 'astral4gamer' ? '/$kind${uri.path}' : uri.path, q);
  }

  void _snack(String m) {
    final ctx = navigatorKey.currentContext;
    if (ctx != null) ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(m)));
  }

  void _openPath(String path, [Map<String, String> query = const {}]) {
    final nav = navigatorKey.currentState;
    if (nav == null) return;
    final parts = path.split('/').where((s) => s.isNotEmpty).toList();
    if (parts.length >= 2 && parts[0] == 'g') {
      nav.push(MaterialPageRoute(builder: (_) => GiftDetailScreen(slug: parts[1])));
    } else if (parts.length >= 2 && parts[0] == 'orders') {
      nav.push(MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: parts[1])));
    } else if (query['order_id'] != null && query['order_id']!.isNotEmpty) {
      nav.push(MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: query['order_id']!)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScope(
      state: widget.state,
      child: Builder(builder: (context) {
        final state = AppScope.of(context);
        return MaterialApp(
          navigatorKey: navigatorKey,
          debugShowCheckedModeBanner: false,
          title: 'Astral4Gamer',
          theme: AppTheme.light(),
          locale: Locale(state.language),
          supportedLocales: const [Locale('fr'), Locale('en')],
          localizationsDelegates: const [GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
          home: !_welcomeDone
              ? LaunchWelcomeScreen(onDone: () => setState(() => _welcomeDone = true))
              : !state.onboardingDone
                  ? OnboardingScreen(onDone: state.finishOnboarding)
                  : const AppShell(),
        );
      }),
    );
  }
}
