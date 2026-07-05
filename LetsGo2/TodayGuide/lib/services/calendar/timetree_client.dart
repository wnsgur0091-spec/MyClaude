import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

/// TimeTree는 3rd-party 조회용 공식 API를 제공하지 않는다. 이 클라이언트는
/// TimeTree 웹앱이 실제로 호출하는 비공식 내부 API(https://timetreeapp.com/api/v1)를
/// 그대로 사용한다. 공식 문서가 없으므로 TimeTree 쪽 변경에 언제든 깨질 수 있다.
///
/// 참고(리버스 엔지니어링 레퍼런스): https://github.com/eoleedi/TimeTree-Exporter
class TimeTreeAuthException implements Exception {
  TimeTreeAuthException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// 세션이 만료되어 재로그인이 필요할 때.
class TimeTreeSessionExpiredException implements Exception {}

class TimeTreeCalendarSummary {
  const TimeTreeCalendarSummary({required this.id, required this.name});
  final String id;
  final String name;
}

class TimeTreeLabel {
  const TimeTreeLabel({required this.id, required this.name, required this.colorHex});
  final int id;
  final String name;
  final String? colorHex;
}

class TimeTreeClient {
  TimeTreeClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _base = 'https://timetreeapp.com/api/v1';
  static const _userAgent = 'web/2.1.0/en';

  Map<String, String> get _jsonHeaders => const {
        'Content-Type': 'application/json',
        'X-Timetreea': _userAgent,
      };

  Map<String, String> _authHeaders(String sessionId) => {
        ..._jsonHeaders,
        'Cookie': '_session_id=$sessionId',
      };

  /// 이메일/비밀번호로 로그인해서 세션 id를 반환한다.
  Future<String> login({required String email, required String password}) async {
    final uri = Uri.parse('$_base/auth/email/signin');
    final response = await _client.put(
      uri,
      headers: _jsonHeaders,
      body: jsonEncode({
        'uid': email,
        'password': password,
        'uuid': _randomUuid(),
      }),
    );

    if (response.statusCode != 200) {
      throw TimeTreeAuthException(_loginErrorMessage(response));
    }

    final sessionId = _extractSessionId(response.headers['set-cookie']);
    if (sessionId == null) {
      throw TimeTreeAuthException('TimeTree 로그인 세션을 가져오지 못했습니다.');
    }
    return sessionId;
  }

  Future<List<TimeTreeCalendarSummary>> getCalendars(String sessionId) async {
    final uri = Uri.parse('$_base/calendars?since=0');
    final response = await _client.get(uri, headers: _authHeaders(sessionId));
    _checkSession(response);
    if (response.statusCode != 200) {
      throw TimeTreeAuthException('TimeTree 캘린더 목록 조회 실패 (${response.statusCode})');
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final calendars = (body['calendars'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
    return calendars
        .map((c) => TimeTreeCalendarSummary(id: '${c['id']}', name: (c['name'] as String?) ?? '(이름 없음)'))
        .toList();
  }

  Future<Map<int, TimeTreeLabel>> getLabels(String sessionId, String calendarId) async {
    final uri = Uri.parse('$_base/calendar/$calendarId/labels');
    final response = await _client.get(uri, headers: _authHeaders(sessionId));
    _checkSession(response);
    if (response.statusCode != 200) return const {};

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final labels = (body['calendar_labels'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
    final result = <int, TimeTreeLabel>{};
    for (final label in labels) {
      final id = label['id'] as int?;
      if (id == null) continue;
      result[id] = TimeTreeLabel(id: id, name: (label['name'] as String?) ?? '', colorHex: _formatColor(label['color']));
    }
    return result;
  }

  Future<List<Map<String, dynamic>>> getEvents(String sessionId, String calendarId) async {
    final events = <Map<String, dynamic>>[];
    var since = 0;
    var hasMore = true;

    while (hasMore) {
      final uri = Uri.parse('$_base/calendar/$calendarId/events/sync?since=$since');
      final response = await _client.get(uri, headers: _authHeaders(sessionId));
      _checkSession(response);
      if (response.statusCode != 200) {
        throw TimeTreeAuthException('TimeTree 일정 조회 실패 (${response.statusCode})');
      }

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      events.addAll((body['events'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>());

      hasMore = body['chunk'] == true;
      if (hasMore) since = body['since'] as int? ?? 0;
    }

    return events;
  }

  void _checkSession(http.Response response) {
    if (response.statusCode == 401 || response.statusCode == 403) {
      throw TimeTreeSessionExpiredException();
    }
  }

  String _loginErrorMessage(http.Response response) {
    try {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final error = body['error'];
      final code = error is Map ? error['code'] : null;
      if (code == -702) return '이메일 또는 비밀번호가 올바르지 않습니다.';
      if (code == -495) return '로그인 시도가 너무 많아요. 잠시 후 다시 시도해주세요.';
    } catch (_) {
      // 무시하고 기본 메시지로 대체.
    }
    return 'TimeTree 로그인에 실패했습니다 (${response.statusCode}).';
  }

  String? _extractSessionId(String? setCookieHeader) {
    if (setCookieHeader == null) return null;
    final match = RegExp(r'_session_id=([^;,]+)').firstMatch(setCookieHeader);
    return match?.group(1);
  }

  String? _formatColor(dynamic color) {
    if (color is int) return '#${color.toRadixString(16).padLeft(6, '0')}';
    if (color is String) return color;
    return null;
  }

  String _randomUuid() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }
}
