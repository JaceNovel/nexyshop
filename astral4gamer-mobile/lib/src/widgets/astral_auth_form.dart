import 'package:country_picker/country_picker.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/api_client.dart';
import '../services/app_scope.dart';
import '../theme/app_theme.dart';
import 'ui.dart';

const apiBase = 'https://api.astral4gamer.com';
const webBase = 'https://astral4gamer.com';

/// Login / sign-up card of the account screen (and of the login prompts before payment).
class AstralAuthForm extends StatefulWidget {
  const AstralAuthForm({super.key, this.onSuccess});
  final VoidCallback? onSuccess;

  @override
  State<AstralAuthForm> createState() => _AstralAuthFormState();
}

class _AstralAuthFormState extends State<AstralAuthForm> {
  bool _signup = false;
  bool _obscure = true;
  bool _terms = false;
  bool _busy = false;
  String? _error;
  Country? _country;
  String _game = 'free_fire';
  /// Player ID on sign-up.
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  @override
  void dispose() {
    for (final c in [_name, _email, _password, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    final state = AppScope.read(context);
    final email = _email.text.trim();
    final password = _password.text;
    setState(() => _error = null);
    if (email.isEmpty || !email.contains('@')) return setState(() => _error = 'Entre une adresse e-mail valide.');
    if (_signup) {
      if (password.length < 8 || password != _confirm.text) return setState(() => _error = 'Choisis un mot de passe d’au moins 8 caractères et confirme-le.');
      if (_country == null) return setState(() => _error = 'Choisis ton pays.');
      if (_game != 'other' && _name.text.trim().isEmpty) return setState(() => _error = 'Entre ton ID joueur.');
      if (!_terms) return setState(() => _error = 'Tu dois accepter les conditions d’utilisation.');
    } else if (password.isEmpty) {
      return setState(() => _error = 'Entre ton mot de passe.');
    }
    setState(() => _busy = true);
    try {
      final res = _signup
          ? await state.api.post('/api/auth/mobile/register', {
              'email': email,
              'password': password,
              'password_confirmation': _confirm.text,
              'country': _country!.countryCode,
              'game': _game,
              if (_game != 'other') 'player_uid': _name.text.trim(),
            })
          : await state.api.post('/api/auth/mobile/session', {'email': email, 'password': password});
      final m = res is Map ? Map<String, dynamic>.from(res) : <String, dynamic>{};
      final token = m.str('token');
      if (token.isEmpty) throw ApiException('Connexion impossible. Réessaie.');
      await state.setSession(token, m.obj('user').isEmpty ? null : m.obj('user'));
      if (!mounted) return;
      showSnack(context, _signup ? 'Compte créé. Bienvenue sur Astral4Gamer !' : 'Connexion réussie.');
      widget.onSuccess?.call();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _forgot() async {
    final email = _email.text.trim();
    if (email.isEmpty) return setState(() => _error = 'Entre d’abord ton e-mail pour réinitialiser le mot de passe.');
    await showDialog(context: context, builder: (_) => _ResetDialog(email: email));
  }

  Future<void> _social(String provider) async {
    final url = provider == 'google' ? '$apiBase/api/auth/google/redirect?client=mobile' : '$webBase/connexion?provider=discord&client=mobile';
    final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    if (!ok && mounted) showSnack(context, 'Impossible d’ouvrir l’espace sécurisé de connexion.');
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 22, 12, 22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF6D9DB)),
        boxShadow: [BoxShadow(color: AppColors.red.withValues(alpha: .06), blurRadius: 24, offset: const Offset(0, 8))],
      ),
      child: Column(
        children: [
          Image.asset('assets/images/astral-logo.png', height: 52),
          const SizedBox(height: 10),
          Text(_signup ? 'Inscription' : 'Connexion', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.slate)),
          const SizedBox(height: 6),
          Text(_signup ? 'Crée ton compte Astral4Gamer' : 'Accède à ton compte Astral4Gamer', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.slate)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(color: AppColors.redSoft, borderRadius: BorderRadius.circular(20)),
            child: const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.verified_user_outlined, color: AppColors.red, size: 18),
              SizedBox(width: 8),
              Text('Connexion sécurisée', style: TextStyle(color: AppColors.red, fontWeight: FontWeight.w700, fontSize: 14)),
            ]),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: SegmentedButton<bool>(
              segments: const [ButtonSegment(value: false, label: Text('Connexion')), ButtonSegment(value: true, label: Text('Inscription'))],
              selected: {_signup},
              onSelectionChanged: (s) => setState(() {
                _signup = s.first;
                _error = null;
              }),
              style: ButtonStyle(
                textStyle: WidgetStateProperty.all(const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                foregroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.slate : AppColors.ink),
                minimumSize: WidgetStateProperty.all(const Size.fromHeight(46)),
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], decoration: const InputDecoration(hintText: 'E-mail', prefixIcon: Icon(Icons.mail_outline))),
          const SizedBox(height: 10),
          TextField(
            controller: _password,
            obscureText: _obscure,
            decoration: InputDecoration(
              hintText: 'Mot de passe',
              prefixIcon: const Icon(Icons.lock_outline),
              suffixIcon: IconButton(icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined), onPressed: () => setState(() => _obscure = !_obscure)),
            ),
          ),
          if (_signup) ...[
            const SizedBox(height: 10),
            TextField(controller: _confirm, obscureText: _obscure, decoration: const InputDecoration(hintText: 'Confirmer le mot de passe', prefixIcon: Icon(Icons.lock_outline))),
            const SizedBox(height: 10),
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => showCountryPicker(
                context: context,
                favorite: const ['TG', 'BJ', 'CI', 'SN', 'BF', 'ML', 'NE', 'CM', 'FR'],
                onSelect: (c) => setState(() => _country = c),
              ),
              child: InputDecorator(
                decoration: const InputDecoration(prefixIcon: Icon(Icons.public), suffixIcon: Icon(Icons.arrow_drop_down)),
                child: Text(_country == null ? 'Pays' : '${_country!.flagEmoji}  ${_country!.name}', style: TextStyle(fontSize: 16, color: _country == null ? AppColors.muted : AppColors.ink)),
              ),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _game,
              decoration: const InputDecoration(prefixIcon: Icon(Icons.sports_esports_outlined)),
              items: const [
                DropdownMenuItem(value: 'free_fire', child: Text('Free Fire')),
                DropdownMenuItem(value: 'pubg', child: Text('PUBG Mobile')),
                DropdownMenuItem(value: 'fortnite', child: Text('Fortnite')),
                DropdownMenuItem(value: 'other', child: Text('Autre')),
              ],
              onChanged: (v) => setState(() => _game = v ?? 'free_fire'),
            ),
            if (_game != 'other') ...[
              const SizedBox(height: 10),
              TextField(controller: _name, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'ID joueur', prefixIcon: Icon(Icons.badge_outlined))),
            ],
            const SizedBox(height: 6),
            CheckboxListTile(
              value: _terms,
              onChanged: (v) => setState(() => _terms = v ?? false),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
              activeColor: AppColors.red,
              title: const Text('J’accepte les Conditions d’utilisation et la Politique de confidentialité.', style: TextStyle(fontSize: 14, color: AppColors.slate, fontWeight: FontWeight.w500)),
            ),
          ] else
            Align(alignment: Alignment.centerRight, child: TextButton(onPressed: _busy ? null : _forgot, child: const Text('Mot de passe oublié ?'))),
          if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.red, fontWeight: FontWeight.w600))),
          FilledButton.icon(
            onPressed: _busy ? null : _submit,
            icon: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Icon(_signup ? Icons.person_add_alt : Icons.login),
            label: Text(_signup ? 'Créer mon compte' : 'Se connecter'),
          ),
          const SizedBox(height: 18),
          const Row(children: [
            Expanded(child: Divider(color: Color(0xFFE5D5D3))),
            Padding(padding: EdgeInsets.symmetric(horizontal: 18), child: Text('ou continuer avec', style: TextStyle(fontSize: 15, color: AppColors.slate, fontWeight: FontWeight.w600))),
            Expanded(child: Divider(color: Color(0xFFE5D5D3))),
          ]),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: _socialButton('assets/images/auth/google.png', 'Google', () => _social('google'))),
            const SizedBox(width: 8),
            Expanded(child: _socialButton('assets/images/auth/discord.png', 'Discord', () => _social('discord'))),
          ]),
          const SizedBox(height: 18),
          TextButton(onPressed: () => launchUrl(Uri.parse(webBase), mode: LaunchMode.externalApplication), child: const Text('Ouvrir la version web')),
        ],
      ),
    );
  }

  Widget _socialButton(String asset, String label, VoidCallback onTap) => OutlinedButton(
        onPressed: _busy ? null : onTap,
        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [Image.asset(asset, width: 22, height: 22), const SizedBox(width: 10), Text(label)]),
      );
}

class _ResetDialog extends StatefulWidget {
  const _ResetDialog({required this.email});
  final String email;
  @override
  State<_ResetDialog> createState() => _ResetDialogState();
}

class _ResetDialogState extends State<_ResetDialog> {
  final _code = TextEditingController();
  final _password = TextEditingController();
  bool _sent = false;
  bool _busy = false;
  String? _msg;

  @override
  void initState() {
    super.initState();
    _request();
  }

  Future<void> _request() async {
    setState(() => _busy = true);
    try {
      await AppScope.read(context).api.post('/api/auth/password/request', {'email': widget.email});
      setState(() {
        _sent = true;
        _msg = 'Un nouveau code vient d’être envoyé à ${widget.email}.';
      });
    } on ApiException catch (e) {
      setState(() => _msg = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reset() async {
    if (_password.text.length < 8) return setState(() => _msg = 'Choisis un mot de passe d’au moins 8 caractères et confirme-le.');
    setState(() => _busy = true);
    try {
      final state = AppScope.read(context);
      final res = await state.api.post('/api/auth/password/reset', {'email': widget.email, 'code': _code.text.trim(), 'password': _password.text, 'password_confirmation': _password.text});
      final token = res is Map ? '${res['token'] ?? ''}' : '';
      if (token.isNotEmpty) await state.setSession(token);
      if (mounted) {
        Navigator.pop(context);
        showSnack(context, 'Mot de passe modifié.');
      }
    } on ApiException catch (e) {
      setState(() => _msg = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Mot de passe oublié'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        if (_msg != null) Text(_msg!, style: const TextStyle(color: AppColors.slate, fontWeight: FontWeight.w600)),
        if (_sent) ...[
          const SizedBox(height: 12),
          TextField(controller: _code, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Code reçu par e-mail')),
          const SizedBox(height: 10),
          TextField(controller: _password, obscureText: true, decoration: const InputDecoration(hintText: 'Nouveau mot de passe')),
        ],
        if (_busy) const Padding(padding: EdgeInsets.only(top: 12), child: LinearProgressIndicator(color: AppColors.red)),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Annuler')),
        if (_sent) TextButton(onPressed: _busy ? null : _request, child: const Text('Renvoyer')),
        if (_sent) FilledButton(style: FilledButton.styleFrom(minimumSize: const Size(110, 44)), onPressed: _busy ? null : _reset, child: const Text('Valider')),
      ],
    );
  }
}
