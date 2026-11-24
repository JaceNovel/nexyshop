import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// First-launch presentation: the 4 illustrated slides of the original app.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.onDone});
  final VoidCallback onDone;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _page = PageController();
  int _i = 0;

  static const _slides = [
    ('assets/images/onboarding/slide-1.png', 'Bienvenue sur Astral4Gamer', 'Tournois, communauté, boutique et récompenses réunis dans une seule app.'),
    ('assets/images/onboarding/slide-2.png', 'Recharge instantanée', 'Diamants, UC, cartes cadeaux et clés de jeux livrés sans attendre.'),
    ('assets/images/onboarding/slide-3.png', 'Paiement sécurisé', 'Mobile Money, carte bancaire, crypto ou wallet Astral4Gamer.'),
    ('assets/images/onboarding/slide-4.png', 'A4G Gifts', 'Crée ta demande, partage-la et reçois le soutien de ta communauté.'),
  ];

  @override
  void dispose() {
    _page.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final last = _i == _slides.length - 1;
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(onPressed: widget.onDone, child: const Text('Passer')),
            ),
            Expanded(
              child: PageView.builder(
                controller: _page,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _i = i),
                itemBuilder: (_, i) {
                  final s = _slides[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      children: [
                        Expanded(child: Image.asset(s.$1, fit: BoxFit.contain)),
                        const SizedBox(height: 12),
                        Text(s.$2, textAlign: TextAlign.center, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.ink)),
                        const SizedBox(height: 8),
                        Text(s.$3, textAlign: TextAlign.center, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w500, color: AppColors.slate)),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _slides.length,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: i == _i ? 22 : 8,
                  height: 8,
                  decoration: BoxDecoration(color: i == _i ? AppColors.red : const Color(0xFFF3C6C9), borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
              child: FilledButton(
                onPressed: last ? widget.onDone : () => _page.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeOut),
                child: Text(last ? 'Commencer' : 'Suivant'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
