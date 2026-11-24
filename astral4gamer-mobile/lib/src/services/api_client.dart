import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// Error returned by the Astral4Gamer API, with the message to show to the user.
class ApiException implements Exception {
  ApiException(this.message, {this.status = 0, this.body});
  final String message;
  final int status;
  final Object? body;
  bool get unauthorized => status == 401;
  @override
  String toString() => message;
}

/// Thin JSON client for https://api.astral4gamer.com (Laravel + Sanctum bearer token).
class ApiClient {
  ApiClient({this.baseUrl = 'https://api.astral4gamer.com', http.Client? client}) : _http = client ?? http.Client();

  final String baseUrl;
  final http.Client _http;
  String? token;
  String locale = 'fr';
  String currency = 'XOF';

  /// Called when the API answers 401 on an authenticated call (session expired).
  void Function()? onUnauthorized;

  Uri uri(String path, [Map<String, Object?>? query]) {
    final q = <String, String>{};
    query?.forEach((k, v) {
      if (v != null && '$v'.isNotEmpty) q[k] = '$v';
    });
    final p = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$baseUrl$p').replace(queryParameters: q.isEmpty ? null : q);
  }

  Map<String, String> get _headers => {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': locale,
        'X-Client': 'astral4gamer-mobile',
        'X-Currency': currency,
        if (token != null && token!.isNotEmpty) 'Authorization': 'Bearer $token',
      };

  Future<dynamic> get(String path, {Map<String, Object?>? query}) => _send('GET', path, query: query);
  Future<dynamic> post(String path, [Object? body]) => _send('POST', path, body: body);
  Future<dynamic> patch(String path, [Object? body]) => _send('PATCH', path, body: body);
  Future<dynamic> delete(String path, [Object? body]) => _send('DELETE', path, body: body);

  Future<dynamic> _send(String method, String path, {Map<String, Object?>? query, Object? body}) async {
    final req = http.Request(method, uri(path, query))..headers.addAll(_headers);
    if (body != null) req.body = jsonEncode(body);
    http.Response res;
    try {
      res = await http.Response.fromStream(await _http.send(req).timeout(const Duration(seconds: 30)));
    } on TimeoutException {
      throw ApiException('Le serveur met trop de temps à répondre. Réessaie.');
    } catch (_) {
      throw ApiException('Connexion impossible. Vérifie ta connexion internet.');
    }
    dynamic data;
    if (res.body.isNotEmpty) {
      try {
        data = jsonDecode(utf8.decode(res.bodyBytes));
      } catch (_) {
        data = res.body;
      }
    }
    if (res.statusCode >= 200 && res.statusCode < 300) return data;
    if (res.statusCode == 401 && token != null) onUnauthorized?.call();
    throw ApiException(_message(data, res.statusCode), status: res.statusCode, body: data);
  }

  static String _message(dynamic data, int status) {
    if (data is Map) {
      final errors = data['errors'];
      if (errors is Map && errors.isNotEmpty) {
        final first = errors.values.first;
        if (first is List && first.isNotEmpty) return '${first.first}';
        if (first is String) return first;
      }
      for (final k in ['message', 'error', 'detail']) {
        final v = data[k];
        if (v is String && v.trim().isNotEmpty) return v;
      }
    }
    if (status == 401) return 'Ta session a expiré. Reconnecte-toi.';
    if (status == 403) return 'Cette action n’est pas autorisée pour ce compte.';
    if (status == 404) return 'L’élément demandé est introuvable ou n’est plus disponible.';
    if (status == 429) return 'Trop de tentatives. Patiente un instant puis réessaie.';
    if (status >= 500) return 'Le service est momentanément indisponible. Réessaie dans un instant.';
    return 'Une erreur est survenue ($status).';
  }
}

/// Helpers to read loosely-typed JSON safely.
extension JsonRead on Map {
  String str(String key, [String fallback = '']) {
    final v = this[key];
    if (v == null) return fallback;
    return '$v';
  }

  String? strOrNull(String key) {
    final v = this[key];
    if (v == null) return null;
    final s = '$v'.trim();
    return s.isEmpty ? null : s;
  }

  num number(String key, [num fallback = 0]) {
    final v = this[key];
    if (v is num) return v;
    if (v is String) return num.tryParse(v) ?? fallback;
    return fallback;
  }

  int integer(String key, [int fallback = 0]) => number(key, fallback).toInt();

  bool flag(String key, [bool fallback = false]) {
    final v = this[key];
    if (v is bool) return v;
    if (v is num) return v != 0;
    if (v is String) return v == '1' || v.toLowerCase() == 'true';
    return fallback;
  }

  Map<String, dynamic> obj(String key) {
    final v = this[key];
    return v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};
  }

  List<Map<String, dynamic>> list(String key) {
    final v = this[key];
    if (v is List) return v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    return const [];
  }
}

/// Unwraps `{data: [...]}` / `{data: {...}}` Laravel resources.
List<Map<String, dynamic>> asList(dynamic json, [String key = 'data']) {
  if (json is List) return json.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  if (json is Map) {
    final v = json[key];
    if (v is List) return v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    if (v is Map && v['data'] is List) return asList(v['data']);
  }
  return const [];
}

Map<String, dynamic> asMap(dynamic json, [String key = 'data']) {
  if (json is Map) {
    final v = json[key];
    if (v is Map) return Map<String, dynamic>.from(v);
    return Map<String, dynamic>.from(json);
  }
  return <String, dynamic>{};
}
