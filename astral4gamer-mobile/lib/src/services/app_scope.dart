import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

import 'app_state.dart';

/// Gives every screen access to [AppState] and rebuilds them when it changes.
class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child}) : super(notifier: state);

  static AppState of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<AppScope>()!.notifier!;
  static AppState read(BuildContext context) => context.getInheritedWidgetOfExactType<AppScope>()!.notifier!;
}

/// "650 FCFA", "12,50 €": amounts as shown in the app.
String formatMoney(num amount, [String currency = 'XOF']) {
  final c = currency.toUpperCase();
  if (c == 'EUR') return '${NumberFormat('#,##0.00', 'fr_FR').format(amount)} €';
  if (c == 'USD') return '${NumberFormat('#,##0.00', 'en_US').format(amount)} USD';
  return '${amount.round()} FCFA';
}

String formatDate(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  final d = DateTime.tryParse(iso);
  if (d == null) return iso;
  return DateFormat('dd/MM/yyyy').format(d.toLocal());
}
