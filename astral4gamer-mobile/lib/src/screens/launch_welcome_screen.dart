import 'dart:async';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Short branded launch screen (logo on white) shown while the app starts.
class LaunchWelcomeScreen extends StatefulWidget {
  const LaunchWelcomeScreen({super.key, required this.onDone});
  final VoidCallback onDone;

  @override
  State<LaunchWelcomeScreen> createState() => _LaunchWelcomeScreenState();
}

class _LaunchWelcomeScreenState extends State<LaunchWelcomeScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..forward();
  Timer? _t;

  @override
  void initState() {
    super.initState();
    _t = Timer(const Duration(milliseconds: 1400), widget.onDone);
  }

  @override
  void dispose() {
    _t?.cancel();
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: FadeTransition(
          opacity: CurvedAnimation(parent: _c, curve: Curves.easeOut),
          child: ScaleTransition(
            scale: Tween(begin: .92, end: 1.0).animate(CurvedAnimation(parent: _c, curve: Curves.easeOutBack)),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset('assets/images/astral-logo.png', width: 180),
                const SizedBox(height: 8),
                const _Wordmark(size: 28),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// "ASTRAL4GAMER" wordmark: bold italic black with the red 4 (home header).
class _Wordmark extends StatelessWidget {
  const _Wordmark({this.size = 26});
  final double size;
  @override
  Widget build(BuildContext context) => Text.rich(
        TextSpan(children: const [
          TextSpan(text: 'ASTRAL'),
          TextSpan(text: '4', style: TextStyle(color: AppColors.red)),
          TextSpan(text: 'GAMER'),
        ]),
        style: TextStyle(fontSize: size, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, color: AppColors.ink, letterSpacing: .5),
      );
}

class Wordmark extends _Wordmark {
  const Wordmark({super.size});
}
